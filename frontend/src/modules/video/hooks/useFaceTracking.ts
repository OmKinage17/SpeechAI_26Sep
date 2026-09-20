import { useEffect, useState, type RefObject } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useFaceTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  stream: MediaStream | null,
  enabled: boolean = true
) {
  const [faceBox, setFaceBox] = useState<FaceBox | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    let model: blazeface.BlazeFaceModel | null = null;
    let isMounted = true;

    if (!enabled || !stream || !videoRef.current) {
      setFaceBox(null);
      return;
    }

    const initTracking = async () => {
      try {
        setIsModelLoading(true);
        setError(null);
        
        // Ensure backend is ready and explicitly set to WebGL
        await tf.ready();
        await tf.setBackend('webgl');
        
        model = await blazeface.load();
        
        if (!isMounted) return;
        setIsModelLoading(false);
        
        const trackFace = async () => {
          if (!isMounted || !videoRef.current || videoRef.current.readyState < 2) {
            if (isMounted) {
              animationFrameId = requestAnimationFrame(trackFace);
            }
            return;
          }
          
          try {
            const predictions = await model!.estimateFaces(videoRef.current, false);
            
            if (predictions.length > 0 && isMounted) {
              const face = predictions[0];
              const topLeft = face.topLeft as [number, number];
              const bottomRight = face.bottomRight as [number, number];
              
              const videoWidth = videoRef.current.videoWidth;
              const videoHeight = videoRef.current.videoHeight;
              
              if (videoWidth > 0 && videoHeight > 0) {
                const width = bottomRight[0] - topLeft[0];
                const height = bottomRight[1] - topLeft[1];
                
                // Account for the mirrored video output (scaleX(-1))
                const mirroredX = videoWidth - topLeft[0] - width;
                
                // Add some padding to frame the head better
                const padX = width * 0.2;
                const padY = height * 0.4;
                
                setFaceBox({
                  x: ((mirroredX - padX) / videoWidth) * 100,
                  y: ((topLeft[1] - padY) / videoHeight) * 100,
                  width: ((width + padX * 2) / videoWidth) * 100,
                  height: ((height + padY * 1.5) / videoHeight) * 100
                });
              }
            } else if (isMounted) {
              setFaceBox(null);
            }
          } catch (err) {
            // Ignore temporary frame estimation errors
            console.debug("Face tracking frame skipped:", err);
          }
          
          if (isMounted) {
            animationFrameId = requestAnimationFrame(trackFace);
          }
        };
        
        trackFace();
      } catch (err: any) {
        console.error("Failed to initialize face tracking model:", err);
        if (isMounted) {
          setError("Failed to load face detection model. Your device might not support WebGL.");
          setIsModelLoading(false);
        }
      }
    };
    
    initTracking();

    return () => {
      isMounted = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [stream, videoRef, enabled]);

  return { faceBox, isModelLoading, error };
}
