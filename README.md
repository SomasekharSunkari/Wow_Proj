# Certificate Verification System using Blockchain

A full-stack application for verifying certificate authenticity using blockchain technology.

## Features

- User authentication with AWS Cognito
- Role-based access control (issuers vs. verifiers)
- Certificate upload and storage in Amazon S3
- SHA-256 hashing for tamper detection
- Blockchain verification using Ethereum Sepolia testnet
- Responsive React frontend with Tailwind CSS

## Project Structure

```
certificate-verification/
├── frontend/                 # React frontend
├── backend/                  # Node.js Express backend
├── blockchain/               # Solidity smart contract
└── README.md                 # Project documentation
```

## Setup Instructions

### Smart Contract Deployment

1. Deploy the `CertificateVerification.sol` contract to Ethereum Sepolia testnet using Remix or Hardhat
2. Save the deployed contract address for backend configuration

### Backend Setup

1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example` and fill in your configuration
4. Start the server: `npm start`

### Frontend Setup

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example` and fill in your configuration
4. Start the development server: `npm start`

### AWS Cognito Setup

1. Create a User Pool in AWS Cognito
2. Add a User Pool App Client
3. Create a group called "issuers"
4. Add users to the issuers group who should have certificate upload permissions

## Usage

### For Certificate Issuers

1. Register and login to the application
2. Ensure your user is added to the "issuers" group in AWS Cognito
3. Upload certificates through the dashboard
4. View uploaded certificates and their blockchain verification status

### For Certificate Verifiers

1. Register and login to the application
2. Navigate to the Verify Certificate page
3. Upload a certificate to check its authenticity
4. View verification result (authentic or tampered)

## Technologies Used

- **Frontend**: React, Tailwind CSS, AWS Amplify
- **Backend**: Node.js, Express
- **Authentication**: AWS Cognito
- **Storage**: Amazon S3
- **Blockchain**: Ethereum (Sepolia), Solidity, ethers.js
- **Hashing**: SHA-256

## Differnce Between Ganache, Sepolia, and Infura

| Tool/Network | Type                | Purpose                                               | Used for                                            |
| ------------ | ------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| **Ganache**  | Local Blockchain    | Run a local Ethereum-like blockchain on your computer | Development and testing locally without real ETH    |
| **Sepolia**  | Public Testnet      | A public Ethereum test network                        | Testing contracts in real-world conditions (public) |
| **Infura**   | Node Provider (API) | Remote access to Ethereum networks (mainnet/testnet)  | Send/read data to Ethereum via HTTPS/WebSocket      |

## INFRA Explonation
 3. Infura (Ethereum Node as a Service)
Infura is not a network. It’s a gateway/API that lets you connect to Ethereum networks (mainnet, Sepolia, Goerli, etc).

Instead of running your own Ethereum node (which is heavy), Infura hosts them and gives you an RPC URL.

txt
Copy
Edit
https://sepolia.infura.io/v3/YOUR_PROJECT_ID
You use this in code (like with Hardhat, web3, ethers.js) to:

Deploy contracts

Read/write blockchain data

Monitor transactions

✅ Pros:

Saves cost & time (no need to run your own node).

Reliable and scalable.

Supports HTTPS and WebSocket.

❌ Cons:

Not decentralized (hosted by Infura).

API usage limits (free tier has quotas).