import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import AWS from 'aws-sdk';
import Web3 from 'web3';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = process.env.PORT || 3001;

// Get current file directory with ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// AWS S3 setup
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Web3 setup with Ganache
const web3 = new Web3(process.env.GANACHE_RPC_URL || 'http://13.53.188.17:8545');

// Load contract ABI from file
let contractABI;
try {
  const abiPath = path.join(__dirname, 'contractABI.json');
  const abiData = fs.readFileSync(abiPath, 'utf8');
  contractABI = JSON.parse(abiData);
  console.log('Contract ABI loaded successfully');
} catch (error) {
  console.error('Error loading contract ABI:', error);
  process.exit(1);
}

// Contract setup
const contractAddress = process.env.CONTRACT_ADDRESS;
if (!contractAddress) {
  console.error('CONTRACT_ADDRESS is not defined in .env file');
  process.exit(1);
}

const contract = new web3.eth.Contract(contractABI, contractAddress);

// Get the first account from Ganache to use for transactions
let ganacheAccount;
web3.eth.getAccounts().then(accounts => {
  ganacheAccount = accounts[0];
  console.log(`Using Ganache account: ${ganacheAccount}`);
}).catch(error => {
  console.error('Error connecting to Ganache:', error);
  process.exit(1);
});

// Middleware to verify JWT token from Cognito
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.decode(token);
    req.user = decoded;
    
    // Check if user is in issuers group
    const groups = decoded['cognito:groups'] || [];
    req.isIssuer = groups.includes('issuers');
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Upload certificate endpoint
app.post('/api/upload', verifyToken, upload.single('certificate'), async (req, res) => {
  if (!req.isIssuer) {
    return res.status(403).json({ message: 'Only issuers can upload certificates' });
  }

  try {
    // Generate hash
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    
    // Upload to S3
    const userId = req.user.sub;
    const key = `certificates/${userId}/${Date.now()}-${req.file.originalname}`;
    
    await s3.upload({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }).promise();
    
    // Store hash on blockchain using Web3
    const gasEstimate = await contract.methods.storeHash(hash).estimateGas({ from: ganacheAccount });
    
    const tx = await contract.methods.storeHash(hash).send({
      from: ganacheAccount,
      gas:200000 // Add 20% buffer to gas estimate
    });
    
    res.json({ 
      success: true, 
      hash,
      s3Key: key,
      txHash: tx.transactionHash
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing certificate', error: error.message });
  }
});

// Verify certificate endpoint
app.post('/api/verify', upload.single('certificate'), async (req, res) => {
  try {
    // Generate hash
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    
    // Verify hash on blockchain using Web3
    const isVerified = await contract.methods.verifyHash(hash).call();
    
    res.json({ 
      success: true, 
      hash,
      isAuthentic: isVerified
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error verifying certificate', error: error.message });
  }
});

// Middleware to verify admin privileges
const verifyAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'No token provided' });
  
  // Check if user is in issuers group
  const groups = req.user['cognito:groups'] || [];
  if (!groups.includes('issuers')) {
    return res.status(403).json({ message: 'Admin privileges required' });
  }
  
  next();
};
// Admin routes
app.get('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Use AWS SDK to list users in Cognito
    const cognito = new AWS.CognitoIdentityServiceProvider();
    
    const params = {
      UserPoolId: process.env.USER_POOL_ID,
    };
    
    const usersList = await cognito.listUsers(params).promise();
    
    // Get users with their groups
    const usersWithGroups = await Promise.all(usersList.Users.map(async (user) => {
      // Get user groups
      const groupParams = {
        UserPoolId: process.env.USER_POOL_ID,
        Username: user.Username
      };
      
      const groupsResponse = await cognito.adminListGroupsForUser(groupParams).promise();
      const groups = groupsResponse.Groups.map(g => g.GroupName);
      
      return {
        username: user.Username,
        email: user.Attributes.find(attr => attr.Name === 'email')?.Value || '',
        group: groups.includes('issuers') ? 'issuers' : 'users'
      };
    }));
    
    res.json({ users: usersWithGroups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

app.post('/api/admin/create-user', verifyToken, verifyAdmin, async (req, res) => {
  try {
   const { email, password, name, group, isIssuer } = req.body;
    
    if (!email || !password ) {
      return res.status(400).json({ message: 'Email, password are required' });
    }
      let userGroup = 'users';
    if (group === 'issuers' || isIssuer === true) {
      userGroup = 'issuers';
    }
    
    
    const cognito = new AWS.CognitoIdentityServiceProvider();
    
    // Create user
    const createParams = {
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
      TemporaryPassword: password,
      MessageAction: 'SUPPRESS', // Don't send welcome email
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        },
        {
          Name: 'email_verified',
          Value: 'true'
        }
      ]
    };
       if (name) {
      createParams.UserAttributes.push({
        Name: 'name',
        Value: name
      });
    }
    
    await cognito.adminCreateUser(createParams).promise();
    
    // Set permanent password
    const setPasswordParams = {
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true
    };
    
    await cognito.adminSetUserPassword(setPasswordParams).promise();
    console.log("Created")
    
    // Add to group if issuer
    if (group === 'issuers') {
      const addToGroupParams = {
        UserPoolId: process.env.USER_POOL_ID,
        Username: email,
        GroupName: 'issuers'
      };
      
      await cognito.adminAddUserToGroup(addToGroupParams).promise();
    }
    
    res.json({ message: 'User created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

app.post('/api/admin/change-group', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { username, group } = req.body;
    
    if (!username || !group) {
      return res.status(400).json({ message: 'Username and group are required' });
    }
    
    const cognito = new AWS.CognitoIdentityServiceProvider();
    
    // Get current groups
    const groupParams = {
      UserPoolId: process.env.USER_POOL_ID,
      Username: username
    };
    
    const groupsResponse = await cognito.adminListGroupsForUser(groupParams).promise();
    const currentGroups = groupsResponse.Groups.map(g => g.GroupName);
    
    // If user is already in the target group, do nothing
    if ((group === 'issuers' && currentGroups.includes('issuers')) || 
        (group === 'users' && !currentGroups.includes('issuers'))) {
      return res.json({ message: 'User is already in the specified group' });
    }
    
    if (group === 'issuers') {
      // Add to issuers group
      const addToGroupParams = {
        UserPoolId: process.env.USER_POOL_ID,
        Username: username,
        GroupName: 'issuers'
      };
      
      await cognito.adminAddUserToGroup(addToGroupParams).promise();
    } else {
      // Remove from issuers group
      const removeFromGroupParams = {
        UserPoolId: process.env.USER_POOL_ID,
        Username: username,
        GroupName: 'issuers'
      };
      
      await cognito.adminRemoveUserFromGroup(removeFromGroupParams).promise();
    }
    
    res.json({ message: 'User group updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating user group', error: error.message });
  }
});

// Add this endpoint for admin statistics
app.get('/api/admin/stats', verifyToken, async (req, res) => {
  if (!req.isIssuer) {
    return res.status(403).json({ message: 'Only issuers can access statistics' });
  }

  try {
    // Initialize stats object
    const stats = {
      totalCertificates: 0,
      totalVerifications: 0,
      activeUsers: 0
    };

    // Get total certificates count from blockchain
    try {
      stats.totalCertificates=10000;
      // stats.totalCertificates = await contract.methods.getTotalHashesCount().call();
    } catch (error) {
      console.error('Error getting certificate count from blockchain:', error);
      // Continue with other stats even if this fails
    }

    // Get active users count from Cognito
    try {
      const cognito = new AWS.CognitoIdentityServiceProvider();
      
      const params = {
        UserPoolId: process.env.USER_POOL_ID,
      };
      
      const usersList = await cognito.listUsers(params).promise();
      stats.activeUsers = usersList.Users.length;
    } catch (error) {
      console.error('Error getting users count from Cognito:', error);
      // Continue with other stats even if this fails
    }

    // For verification count, we could store this in a database
    // For now, we'll use a placeholder or mock value
    stats.totalVerifications = 0;
    
    // If you have a database, you could query it for verification count
    // Example: stats.totalVerifications = await db.verifications.count();

    // Convert any BigInt values to strings to avoid JSON serialization issues
    const safeStats = {
      totalCertificates: stats.totalCertificates.toString(),
      totalVerifications: stats.totalVerifications.toString(),
      activeUsers: stats.activeUsers.toString()
    };

    res.json(safeStats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
});

// Add endpoint for toggling issuer status
app.put('/api/admin/users/:email/toggle-issuer', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { isIssuer } = req.body;
    console.log("Email: ", email);
    console.log("isIssuer: ", isIssuer);
    
    if (email === undefined || isIssuer === undefined) {
      return res.status(400).json({ message: 'Email and isIssuer status are required' });
    }
    
    const cognito = new AWS.CognitoIdentityServiceProvider();
    
    if (isIssuer) {
      // Add to issuers group
      const addToGroupParams = {
        UserPoolId: process.env.USER_POOL_ID,
        Username: email,
        GroupName: 'issuers'
      };
      
      await cognito.adminAddUserToGroup(addToGroupParams).promise();
    } else {
      // Remove from issuers group
      const removeFromGroupParams = {
        UserPoolId: process.env.USER_POOL_ID,
        Username: email,
        GroupName: 'issuers'
      };
      
      await cognito.adminRemoveUserFromGroup(removeFromGroupParams).promise();
    }
    
    res.json({ message: 'User issuer status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating user issuer status', error: error.message });
  }
});

// Endpoint to get certificates uploaded by the current user
app.get('/api/certificates/my-uploads', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub; // Get user ID from the token
    
    // List objects in the S3 bucket with the user's ID prefix
    const s3 = new AWS.S3();
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: `certificates/${userId}/`
    };
    
    const s3Objects = await s3.listObjectsV2(params).promise();
    
    // Transform S3 objects into a more usable format
    const certificates = await Promise.all((s3Objects.Contents || []).map(async (object) => {
      // Extract filename from the key
      const filename = object.Key.split('/').pop();
      
      // Generate a temporary signed URL for viewing the certificate
      const url = s3.getSignedUrl('getObject', {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: object.Key,
        Expires: 3600 // URL expires in 1 hour
      });
      
      // Try to get metadata if available
      let hash = '';
      let txHash = '';
      
      try {
        const headParams = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: object.Key
        };
        
        const metadata = await s3.headObject(headParams).promise();
        hash = metadata.Metadata?.hash || '';
        txHash = metadata.Metadata?.txhash || '';
      } catch (error) {
        console.error(`Error getting metadata for ${object.Key}:`, error);
      }
      
      return {
        id: object.Key,
        filename: filename,
        uploadDate: object.LastModified,
        size: object.Size,
        url: url,
        hash: hash,
        txHash: txHash
      };
    }));
    
    res.json({ certificates });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ message: 'Error fetching certificates', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});







