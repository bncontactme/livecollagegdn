const OBSWebSocket = require('obs-websocket-js').default;
const fs = require('fs');
const path = require('path');

const obs = new OBSWebSocket();
const SCREENSHOT_INTERVAL = 5000;
const SCENE_SWITCH_INTERVAL = 10000; // e.g. switch every 10 seconds
const SCREENSHOT_FOLDER = path.resolve(__dirname, 'images');

if (!fs.existsSync(SCREENSHOT_FOLDER)) {
    fs.mkdirSync(SCREENSHOT_FOLDER, { recursive: true });
}

async function connectOBS() {
    try {
        await obs.connect('ws://192.168.0.191:4455', '');
        console.log('✅ Connected to OBS WebSocket');

        // Get all scenes
        const { scenes } = await obs.call('GetSceneList');
        const sceneNames = scenes.map(s => s.sceneName);
        console.log('🎬 Scenes:', sceneNames);

        // Random scene switching
        setInterval(async () => {
            const randomScene = sceneNames[Math.floor(Math.random() * sceneNames.length)];
            try {
                await obs.call('SetCurrentProgramScene', { sceneName: randomScene });
                console.log(`🔀 Switched to scene: ${randomScene}`);
            } catch (err) {
                console.error('❌ Scene switch error:', err.message);
            }
        }, SCENE_SWITCH_INTERVAL);

        // Screenshot logic (captures what is currently live/output)
        setInterval(async () => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `screenshot_${timestamp}.png`;
            const fullPath = path.join(SCREENSHOT_FOLDER, fileName);

            try {
                // Get the current program scene name
                const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
                const { imageData } = await obs.call('GetSourceScreenshot', {
                    sourceName: currentProgramSceneName,
                    imageFormat: 'png',
                    imageWidth: 1280,
                    imageHeight: 720
                });
                const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
                fs.writeFileSync(fullPath, base64Data, 'base64');
                console.log(`✅ Saved screenshot: ${fullPath}`);
            } catch (err) {
                console.error('❌ Screenshot error:', err.message);
            }
        }, SCREENSHOT_INTERVAL);

    } catch (err) {
        console.error('❌ Connection error:', err.message);
    }
}

if (require.main === module) {
    connectOBS();
}

module.exports = { connectOBS };