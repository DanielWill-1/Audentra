# Audentra

Audentra is a cutting-edge voice form application that leverages text-to-speech (TTS) and speech-to-text (SST) technologies to enhance user interaction. This project includes both a frontend and a backend server for seamless functionality.

## Features
- **Voice Demo**: Try out the voice demo to experience the TTS and SST capabilities.
- **Help Center**: Access resources and tutorials to get started.
- **Developer Documentation**: Learn how to integrate and extend the application.
- **Responsive Design**: Optimized for both desktop and mobile devices.

## Tech Stack
- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express
- **APIs**: Google Cloud Speech-to-Text and Text-to-Speech
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher)

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/voiceform.git
   cd voiceform/VoiceForm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage
### Run the Development Server
To start the frontend development server:
```bash
npm run dev
```
This will launch the application at `http://localhost:3000`.

### Run the Backend Server
To start the backend server for TTS and SST:
```bash
npm run server
```
The backend server will run at `http://localhost:3001`.

## Scripts
- `npm run dev`: Starts the frontend development server.
- `npm run server`: Starts the backend server.
- `npm run build`: Builds the project for production.
- `npm run preview`: Previews the production build.

## Folder Structure
```
VoiceForm/
├── public/             # Static assets (e.g., images, icons)
├── src/                # Source code
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── styles/         # Global styles
│   └── utils/          # Utility functions
├── server/             # Backend server code
├── package.json        # Project metadata and scripts
└── README.md           # Project documentation
```

## Environment Variables
Create a `.env` file in the root directory and add the following variables:
```
VITE_API_BASE=http://localhost:3001
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id
```

## Deployment
1. Build the project:
   ```bash
   npm run build
   ```
2. Serve the `dist` folder using a static file server or deploy it to a hosting platform like Vercel, Netlify, or Render.

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push the branch.
4. Open a pull request.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments
- Built with [Vite](https://vitejs.dev/).
- Powered by Google Cloud Speech-to-Text and Text-to-Speech APIs.

## Contact
For questions or support, please contact [your-email@example.com].

