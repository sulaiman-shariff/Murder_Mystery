# Murder Mystery Game - Deployment Guide

## Vercel (Next.js)

The app is now a single Next.js project. The existing game screens are served by the App Router, and the former Express AI proxy is implemented as Vercel Route Handlers under `src/app/api`.

1. Import this repository into Vercel and keep the framework preset as **Next.js**.
2. Add these server-side environment variables in the Vercel project settings:
   - `GOOGLE_CLOUD_PROJECT` (for example `striped-sight-443116-g6`)
   - `GOOGLE_CLOUD_LOCATION` (for example `us-central1`)
   - `GOOGLE_SERVICE_ACCOUNT_JSON` containing the service-account JSON as one-line JSON
3. Leave `NEXT_PUBLIC_API_URL` unset to use the same deployment's `/api` routes. Set it only when intentionally using an external API.
4. Deploy. Vercel runs `npm run build` and serves the frontend and API routes from the same domain.

For a local production check:

```bash
npm install
npm run build
npm start
```

Do not commit service-account JSON files. The previously tracked key has been removed; rotate/revoke that Google Cloud key before deploying, then use a new key in Vercel's encrypted environment variable instead.

## Overview
This guide will help you deploy the Murder Mystery Game with AWS Lambda backend and modern frontend.

## Prerequisites
- AWS Account with appropriate permissions
- Node.js (v16 or higher)
- Python 3.9+
- AWS CLI configured
- Serverless Framework

## Environment Setup

### 1. Backend Environment Variables
Create a `.env` file in the `backend/` directory:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1

# Admin Password (default: ATRIA)
ADMIN_PASSWORD=ATRIA

# Google Cloud Configuration (for Vertex AI)
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_CLOUD_LOCATION=us-central1
VERTEX_AI_CREDENTIALS_FILE=path_to_credentials.json
```

### 2. Frontend Environment Variables
Create a `.env` file in the root directory:

```bash
# API Configuration
REACT_APP_API_URL=https://your-lambda-api-gateway-url.amazonaws.com/dev
```

## Backend Deployment

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Deploy to AWS Lambda
```bash
# Install Serverless Framework globally
npm install -g serverless

# Deploy the backend
serverless deploy
```

### 3. Create DynamoDB Tables
The tables will be created automatically on first deployment, but you can also create them manually:

```bash
# Create leaderboard table
aws dynamodb create-table \
  --table-name murder-mystery-leaderboard \
  --attribute-definitions AttributeName=team_name,AttributeType=S AttributeName=timestamp,AttributeType=S \
  --key-schema AttributeName=team_name,KeyType=HASH AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# Create teams table
aws dynamodb create-table \
  --table-name murder-mystery-teams \
  --attribute-definitions AttributeName=team_name,AttributeType=S \
  --key-schema AttributeName=team_name,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## Frontend Deployment

### 1. Build the Application
```bash
npm run build
```

### 2. Deploy to AWS S3
```bash
# Create S3 bucket (if not exists)
aws s3 mb s3://murder-mystery-frontend

# Configure bucket for static website hosting
aws s3 website s3://murder-mystery-frontend --index-document index.html --error-document index.html

# Upload files
aws s3 sync build/ s3://murder-mystery-frontend --delete
```

### 3. Configure CloudFront (Optional)
For better performance and HTTPS:

```bash
# Create CloudFront distribution pointing to your S3 bucket
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

## Local Development

### 1. Start Backend Locally
```bash
cd backend
python app.py
```

### 2. Start Frontend Locally
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /register` - Register a new team
- `POST /login` - Login with team credentials

### Game
- `POST /start_game` - Start a new game session
- `POST /get_hint` - Get AI-generated hint
- `POST /validate_motive` - Validate player's motive guess
- `POST /save_result` - Save game result

### Leaderboard
- `GET /leaderboard` - Get top players
- `GET /team_stats/{team_name}` - Get team statistics

### Utilities
- `GET /mysteries` - Get available mysteries
- `GET /mystery/{mystery_id}` - Get specific mystery
- `GET /health` - Health check

## Security Considerations

### 1. Admin Password
- Change the default admin password (ATRIA) in production
- Use environment variables for sensitive data
- Consider implementing proper password hashing

### 2. AWS Permissions
- Use IAM roles with minimal required permissions
- Enable CloudTrail for audit logging
- Configure VPC if needed

### 3. CORS Configuration
- Update CORS settings in `app.py` for production domains
- Restrict allowed origins to your frontend domain

## Monitoring and Logging

### 1. CloudWatch Logs
Lambda functions automatically log to CloudWatch. Monitor:
- Function execution times
- Error rates
- Memory usage

### 2. DynamoDB Metrics
Monitor:
- Read/Write capacity
- Throttled requests
- Error rates

### 3. API Gateway
Monitor:
- Request counts
- 4xx/5xx errors
- Latency

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check CORS configuration in backend
   - Verify frontend URL is in allowed origins

2. **DynamoDB Connection Issues**
   - Verify AWS credentials
   - Check IAM permissions
   - Ensure tables exist

3. **Lambda Timeout**
   - Increase timeout in `serverless.yml`
   - Optimize code for faster execution

4. **Vertex AI Errors**
   - Verify Google Cloud credentials
   - Check project permissions
   - Ensure Vertex AI API is enabled

### Debug Commands

```bash
# Check Lambda logs
serverless logs -f api

# Test API locally
curl -X POST http://localhost:8000/health

# Check DynamoDB tables
aws dynamodb describe-table --table-name murder-mystery-leaderboard
```

## Cost Optimization

### 1. Lambda
- Use appropriate memory allocation
- Implement connection pooling
- Cache frequently accessed data

### 2. DynamoDB
- Use on-demand billing for variable workloads
- Implement TTL for old data
- Use efficient query patterns

### 3. API Gateway
- Enable caching where appropriate
- Use compression
- Monitor usage patterns

## Updates and Maintenance

### 1. Backend Updates
```bash
cd backend
serverless deploy
```

### 2. Frontend Updates
```bash
npm run build
aws s3 sync build/ s3://murder-mystery-frontend --delete
```

### 3. Database Migrations
- Use DynamoDB streams for data migration
- Implement versioning for schema changes
- Test migrations in staging environment

## Support

For issues and questions:
1. Check CloudWatch logs
2. Review API Gateway metrics
3. Test endpoints individually
4. Verify environment variables
5. Check AWS service status

## License
This project is developed by Code Club and made by Sulaiman.
