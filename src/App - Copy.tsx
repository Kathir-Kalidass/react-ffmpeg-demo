import { useState, useRef,useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";







function App() {
  const [loaded, setLoaded] = useState(false);

  const [num ,setNum] = useState(0);
  const [inputImage, setInputImage] = useState<string>("");
  const [outputImage, setOutputImage] = useState<string>("");
  const ffmpegRef = useRef(new FFmpeg());
  const messageRef = useRef<HTMLParagraphElement | null>(null);
  const [isFFmpegLoading, setIsFFmpegLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
   const [ffmpegLogs, setFfmpegLogs] = useState<string[]>([]);

  


  const load = async () => {
    const baseURL = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm";
    const ffmpeg = ffmpegRef.current;

      

    ffmpeg.on("log", ({ message }) => {
      setFfmpegLogs(prev => [...prev, message]);
      
      console.log("FFmpeg Log:", message);
    });

    ffmpeg.on("progress", ({ progress }) => {
      setFfmpegLogs((prev) => [
        ...prev,
        `Progress: ${(progress * 100).toFixed(2)}%`,
      ]);
    });

    // Load FFmpeg Core
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      workerURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.worker.js`,
        "text/javascript"
      ),
    });

    setIsFFmpegLoading(false);
    setFfmpegLogs((prev) => [...prev, "FFmpeg loaded successfully!"]);
  };


  const loadold = async () => {
    const baseURL = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm";
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on("log", ({ message }) => {
      setFfmpegLogs(prev => [...prev, message]);
      console.log("FFmpeg Log:", message);
    });

    ffmpeg.on("progress", ({ progress, time }) => {
      setFfmpegLogs(prev => [...prev, `Progress: ${(progress * 100).toFixed(2)}%`]);
    });
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript"),
    });
    setLoaded(true);
    setIsFFmpegLoading(false);
   // setFfmpegLogs(prev => [...prev, "FFmpeg loaded successfully!"]);

  };


  useEffect(() => {

    setNum(Math.random());
    const loadFFmpeg = async () => {
      try {
        await load();
      } catch (error) {
        console.error('FFmpeg load error:', error);
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
    // Step 1: Write input file
    setFfmpegLogs(prev => [...prev, "Writing input file..."]);
    await ffmpeg.writeFile('input.png', await fetchFile(imageUrl));
    
    // Step 2: Simplified conversion with progress tracking
    setFfmpegLogs(prev => [...prev, "Starting conversion..."]);
    
    // Set a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('FFmpeg operation timed out')), 30000)
    );
  
    // Main FFmpeg operation
    const ffmpegPromise = ffmpeg.exec([
      '-i', 'input.png',
      '-vf', 'format=gray', // Simplified filter chain
      '-y', // Overwrite output if exists
      'output.png'
    ]);
  
    // Race between timeout and operation
    await Promise.race([ffmpegPromise, timeoutPromise]);
    
    // Step 3: Read output
    setFfmpegLogs(prev => [...prev, "Reading output file..."]);
    const data = await ffmpeg.readFile('output.png');
    const url = URL.createObjectURL(new Blob([data], { type: 'image/png' }));
    setOutputImage(url);
    
    setFfmpegLogs(prev => [...prev, "Conversion complete"]);
  } catch (error) {
    setFfmpegLogs(prev => [...prev, `Error: ${error.message}`]);
    console.error('FFmpeg error:', error);
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
