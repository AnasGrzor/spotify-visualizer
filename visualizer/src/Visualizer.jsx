import { useRef, useEffect } from "react";

const Visualizer = ({ track }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  let phase = 0;

  // Define an array of wave configurations.
  // Each wave has properties for its base amplitude, frequency, color, etc.
  const waves = [
    {
      offset: 0,
      baseAmplitude: 20,
      frequency: 0.01,
      lineWidth: 2,
      color: "rgba(255,255,255,0.6)",
      bounce: 0,
      bounceMax: 15,
    },
    {
      offset: 1,
      baseAmplitude: 30,
      frequency: 0.008,
      lineWidth: 2,
      color: "rgba(255,255,255,0.4)",
      bounce: 0,
      bounceMax: 20,
    },
    {
      offset: 2,
      baseAmplitude: 15,
      frequency: 0.012,
      lineWidth: 1.5,
      color: "rgba(255,255,255,0.8)",
      bounce: 0,
      bounceMax: 10,
    },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Function to make the canvas always fill the window.
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Update the bounce value for each wave at an interval.
    // When a track is playing, update more frequently to simulate the song's rhythm.
    const bounceInterval = setInterval(
      () => {
        waves.forEach((wave) => {
          // Random bounce between -bounceMax and bounceMax.
          wave.bounce = Math.random() * wave.bounceMax * 2 - wave.bounceMax;
        });
      },
      track ? 100 : 200
    );

    const animate = () => {
      phase += 0.05; // Increment phase for continuous movement
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Loop through each wave and draw it.
      waves.forEach((wave) => {
        ctx.save();
        // Apply a slight vertical scaling to simulate depth (3D effect).
        const depthScale = 1 - wave.offset * 0.1;
        ctx.scale(1, depthScale);

        ctx.beginPath();
        // Adjust starting Y position based on the scaling.
        ctx.moveTo(0, canvas.height / 2 / depthScale);
        for (let x = 0; x <= canvas.width; x++) {
          // Calculate a dynamic amplitude by adding the random bounce to the base amplitude.
          const amplitude = wave.baseAmplitude + wave.bounce;
          const y =
            amplitude * Math.sin(x * wave.frequency + phase + wave.offset) +
            canvas.height / 2 / depthScale;
          ctx.lineTo(x, y);
        }
        // Set the stroke style and add a shadow for a 3D glow.
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = wave.lineWidth;
        ctx.shadowColor = wave.color;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      clearInterval(bounceInterval);
      cancelAnimationFrame(animationRef.current);
    };
  }, [track]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <canvas ref={canvasRef} className="absolute top-0 left-0" />
      {track && track.item ? (
        <div className="absolute bottom-8 left-8 flex items-center text-white z-10">
          {track.item.album.images && track.item.album.images[0] && (
            <img
              src={track.item.album.images[0].url}
              alt="Album Art"
              className="w-20 h-20 mr-5 rounded"
            />
          )}
          <div>
            <h2 className="text-2xl font-bold">{track.item.name}</h2>
            <p className="text-lg">
              {track.item.artists.map((artist) => artist.name).join(", ")}
            </p>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-8 left-8 text-white z-10">
          <h2 className="text-2xl font-bold">No track currently playing</h2>
        </div>
      )}
    </div>
  );
};

export default Visualizer;
