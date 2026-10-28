import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { useState, useRef, useEffect } from 'react';




function App() {
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [sketchedImageUrl, setSketchedImageUrl] = useState<string | null>(null);
  
  const ffmpegRef = useRef(new FFmpeg());
  const messageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {


    const load = async () => {
      const baseURL = "https://unpkg.com/@ffmpeg/core-mt@0.12.7/dist/esm";
      const ffmpeg = ffmpegRef.current;
      ffmpeg.on("log", ({ message }) => {
        if (messageRef.current) messageRef.current.innerHTML = message;
      });
      // toBlobURL is used to bypass CORS issue, urls with the same
      // domain can be used directly.
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
        workerURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.worker.js`,
          "text/javascript"
        ),
      });
      setLoaded(true);
    };


    load();
  }, []);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);
      setOriginalImage(file);

      const ffmpeg = ffmpegRef.current;
      await ffmpeg.writeFile('input.png', await fetchFile(file));

      await ffmpeg.exec([
        '-i', 'input.png',
        '-vf', 'colorlevels=rimin=0.05:gimin=0.05:bimin=0.05:rimax=0.95:gimax=0.95:bimax=0.95,grayscale,unsharp=5:5:1.5:5:1.5:0',
        'output.png'
      ]);

      const data = await ffmpeg.readFile('output.png');
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
      
      await ffmpeg.deleteFile('input.png');
      await ffmpeg.deleteFile('output.png');

      setSketchedImageUrl(url);
    } catch (err) {
      setError('Failed to process image');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Image to Pencil Sketch Converter</h1>
      {!loaded ? (
        <p>Loading FFmpeg Core (~31 MB)...</p>
      ) : (
        <>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload}
            disabled={isLoading} 
          />
          
          <p ref={messageRef}></p>
          {error && <div className="error">{error}</div>}
          {isLoading && <div className="loading">Processing image...</div>}
          
          <div className="image-container">
            {originalImage && (
              <div>
                <h2>Original Image</h2>
                <img src={URL.createObjectURL(originalImage)} alt="Original" width="300" />
              </div>
            )}
            {sketchedImageUrl && (
              <div>
                <h2>Pencil Sketch</h2>
                <img src={sketchedImageUrl} alt="Pencil Sketch" width="300" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;