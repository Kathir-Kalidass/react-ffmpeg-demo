import { useState, useRef, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { FFmpeg as FFmpegCore } from "@ffmpeg/ffmpeg/dist/esm/ffmpeg";
import { toBlobURL } from '@ffmpeg/util';

function App() {
  const [loaded, setLoaded] = useState(false);
  const [num, setNum] = useState(0);
  const [inputImage, setInputImage] = useState<string>("");
  const [outputImage, setOutputImage] = useState<string>("");
  const ffmpegRef = useRef<FFmpegCore>(new FFmpeg());
  const [isFFmpegLoading, setIsFFmpegLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ffmpegLogs, setFfmpegLogs] = useState<string[]>([]);

  useEffect(() => {
    
    setNum(Math.random());
    const loadFFmpeg = async () => {
      try {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpegRef.current.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setIsFFmpegLoading(false);
        setLoaded(true);
      } catch (error) {
        console.error('Error loading FFmpeg:', error);
        setFfmpegLogs(prev => [...prev, `FFmpeg loading error: ${error.message}`]);
      }
    };
    loadFFmpeg();
  }, []);


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const image = new Image();
      image.src = URL.createObjectURL(file);
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(image, 0, 0);
          const pngDataUrl = canvas.toDataURL('image/png');
          setInputImage(pngDataUrl);
          convertToSketch(pngDataUrl);
        }
      };
    }
  };
  
const convertToSketch = async (imageUrl: string) => {
  setIsProcessing(true);
  setFfmpegLogs([]); // Clear previous logs
  const ffmpeg = ffmpegRef.current;

  try {
    window.ffmpeg = ffmpeg;
    // Step 1: Write input file
    setFfmpegLogs(prev => [...prev, "Writing input file..."]);
    await ffmpeg.writeFile('input.png', await fetchFile(imageUrl));

    // Progress monitoring using the correct event listener
    ffmpeg.on('progress', ({ progress, time }) => {
      setFfmpegLogs(prev => [...prev, `Progress: ${Math.round(progress * 100)}%`]);
    });

    // Step 2: Simple grayscale conversion
    setFfmpegLogs(prev => [...prev, "Starting conversion..."]);
    await ffmpeg.exec([
      '-i', 'input.png',
      '-vf', 'format=gray,edgedetect,negate',
      'output.png'
    ]);

    /*
    // for black and white
await ffmpeg.exec([
      '-i', 'input.png',
      '-vf', 'format=gray,edgedetect,negate',
      'output.png'
    ]);
    */
    
    // Step 3: Read output
    setFfmpegLogs(prev => [...prev, "Reading output file..."]);
    const data = await ffmpeg.readFile('output.png');
    const url = URL.createObjectURL(new Blob([data], { type: 'image/png' }));
    setOutputImage(url);
    setFfmpegLogs(prev => [...prev, "Conversion completed!"]);

  } catch (error) {
    console.error('Conversion error:', error);
    setFfmpegLogs(prev => [...prev, `Error: ${error.message}`]);
  } finally {
    setIsProcessing(false);
  }
};

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      {isFFmpegLoading ? (
        <div className="loading">
          <h2>Loading FFmpeg...</h2>
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload}
            disabled={isProcessing}
            style={{ marginBottom: '20px' }}
          />
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            {inputImage && (
              <div>
                <h3>Original Image</h3>
                <img 
                  src={inputImage} 
                  alt="Input" 
                  style={{ maxWidth: '400px', maxHeight: '400px' }}
                />
              </div>
            )}
            
            {isProcessing ? (
              <div className="processing">
                <h3>Converting...</h3>
                <div className="spinner"></div>
              </div>
            ) : outputImage && (
              <div>
                <h3>Sketch Output</h3>
                <img 
                  src={outputImage} 
                  alt="Output"
                  style={{ maxWidth: '400px', maxHeight: '400px' }}
                />
              </div>
            )}
          </div>
        </>
      )}


<div className="logs-container">
        <h3>FFmpeg Logs</h3>
        <div className="logs-scroll">
          {ffmpegLogs.map((log, index) => (
            <div key={index} className="log-line">
              <span className="log-time">[{new Date().toLocaleTimeString()}]</span>
              <span className="log-message">{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// export default App;
export default App;
