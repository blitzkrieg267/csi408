# Service Marketplace Platform (SMP)

A full-stack service marketplace platform where service providers can bid on jobs posted by service seekers.

## Features

- User authentication and authorization
- Job posting and management
- Bid management system
- Real-time notifications
- Category-based job filtering
- Location-based job matching
- Provider-seeker matching algorithm

## Tech Stack

- Frontend: Next.js, React, Material-UI
- Backend: Node.js, Express
- Database: MongoDB
- Authentication: Clerk
- Real-time: Socket.io

## Project Structure

```
SMP/
├── frontend/           # Next.js frontend application
│   ├── src/
│   │   ├── app/       # Next.js app router
│   │   │   ├── components/# Reusable components
│   │   │   └── utils/     # Utility functions
│   │   └── public/        # Static assets
│   └── backend/           # Express backend server
│       ├── routes/        # API routes
│       ├── models/        # Database models
│       └── utils/         # Utility functions
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/SMP.git
cd SMP
```

2. Install dependencies:
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Set up environment variables:
- Create `.env` files in both frontend and backend directories
- Add necessary environment variables (see .env.example files)

4. Start the development servers:
```bash
# Start backend server
cd backend
npm run dev

# Start frontend server
cd frontend
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 