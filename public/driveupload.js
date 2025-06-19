require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const readline = require('readline');

// ENV variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const TOKEN_PATH = path.join(__dirname, 'token.json');
const UPLOADED_FILE_PATH = path.join(__dirname, 'uploaded_files.json');

// OAuth2 client
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Load token from file or start auth flow
function loadToken() {
  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH, 'utf-8');
    oAuth2Client.setCredentials(JSON.parse(token));
    console.log('Token loaded successfully.');
  } else {
    getNewToken();
  }
}

// Get a new token if one is not found
function getNewToken() {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
  });

  console.log('Authorize this app by visiting this URL:', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the code from that page here: ', async (code) => {
    rl.close();
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
      console.log('Token stored to', TOKEN_PATH);
    } catch (error) {
      console.error('Error while trying to retrieve access token', error);
    }
  });
}

// Initialize Google Drive API client
const drive = google.drive({ version: 'v3', auth: oAuth2Client });

// Load the list of already uploaded files
function loadUploadedFiles() {
  if (fs.existsSync(UPLOADED_FILE_PATH)) {
    return JSON.parse(fs.readFileSync(UPLOADED_FILE_PATH, 'utf-8'));
  }
  return [];
}

// Save the updated list of uploaded files
function saveUploadedFiles(files) {
  fs.writeFileSync(UPLOADED_FILE_PATH, JSON.stringify(files, null, 2), 'utf-8');
}

// Upload a file to Google Drive
async function uploadFile(filePath) {
  const fileName = path.basename(filePath);
  const uploadedFiles = loadUploadedFiles();

  // Skip if already uploaded
  if (uploadedFiles.includes(fileName)) {
    console.log(`Skipping already uploaded file: ${fileName}`);
    return;
  }

  const fileMetadata = {
    name: fileName,
    parents: [FOLDER_ID],
  };
  const media = {
    mimeType: 'image/png',
    body: fs.createReadStream(filePath),
  };

  try {
    const res = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });
    console.log(`File uploaded successfully: ${fileName}`);

    // Save this file name to the list of uploaded files
    uploadedFiles.push(fileName);
    saveUploadedFiles(uploadedFiles);
  } catch (error) {
    console.error('Error uploading file:', error.message);
  }
}

// Check for new images in the captures folder and upload them
async function uploadImagesFromFolder() {
  const capturesDir = path.join(__dirname, 'captures');

  if (!fs.existsSync(capturesDir)) {
    console.log('Captures folder does not exist');
    return;
  }

  const files = fs.readdirSync(capturesDir);
  const imageFiles = files.filter(file => file.endsWith('.png'));

  if (imageFiles.length === 0) {
    console.log('No new images to upload');
    return;
  }

  for (const file of imageFiles) {
    const filePath = path.join(capturesDir, file);
    await uploadFile(filePath);
  }
}

module.exports = {
  uploadImagesFromFolder,
  loadToken,
  oAuth2Client,
};