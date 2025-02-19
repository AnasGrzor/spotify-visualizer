import { useRef, useState, useEffect } from "react";
import { FaBackward, FaPlay, FaPause, FaForward } from "react-icons/fa";
import PropTypes from "prop-types";

// Linear interpolation helper.
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Parse an "rgb(r, g, b)" string into an array of numbers.
function parseRGB(rgbString) {
  const result = rgbString.match(/rgb\((\d+), (\d+), (\d+)\)/);
  if (result) {
    return [parseInt(result[1]), parseInt(result[2]), parseInt(result[3])];
  }
  return [255, 255, 255];
}

// Convert an array of RGB numbers to a string.
function rgbToString(rgbArray) {
  const [r, g, b] = rgbArray.map((n) => Math.floor(n));
  return `rgb(${r}, ${g}, ${b})`;
}

// Generate a random rgb color string.
function randomColor() {
  const r = Math.floor(Math.random() * 156) + 100;
  const g = Math.floor(Math.random() * 156) + 100;
  const b = Math.floor(Math.random() * 156) + 100;
  return `rgb(${r}, ${g}, ${b})`;
}

const Visualizer = ({ track, token }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const albumImgRef = useRef(null);
  const isPlayingRef = useRef((track && track.is_playing) || false);
  const [isPlaying, setIsPlaying] = useState(
    (track && track.is_playing) || false
  );

  useEffect(() => {
    isPlayingRef.current = !!(track && track.is_playing && isPlaying);
  }, [isPlaying, track]);

  useEffect(() => {
    if (!track) {
      setIsPlaying(false);
    } else {
      setIsPlaying(track.is_playing);
    }
  }, [track]);

  const handlePlayPause = async () => {
    if (!track || !token) return;
    setIsPlaying((prev) => !prev);
    try {
      if (isPlayingRef.current) {
        await fetch("https://api.spotify.com/v1/me/player/pause", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch("https://api.spotify.com/v1/me/player/play", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error("Error toggling play/pause", err);
      setIsPlaying((prev) => !prev);
    }
  };

  const handleNext = async () => {
    if (!track || !token) return;
    try {
      await fetch("https://api.spotify.com/v1/me/player/next", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Error skipping to next track", err);
    }
  };

  const handlePrev = async () => {
    if (!track || !token) return;
    try {
      await fetch("https://api.spotify.com/v1/me/player/previous", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Error going to previous track", err);
    }
  };

  useEffect(() => {
    if (
      track &&
      track.item &&
      track.item.album &&
      track.item.album.images &&
      track.item.album.images[0]
    ) {
      albumImgRef.current = new Image();
      albumImgRef.current.src = track.item.album.images[0].url;
    } else {
      albumImgRef.current = null;
    }
  }, [track]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Persistent animation state.
    let currentColorRGB = parseRGB(randomColor());
    let targetColorRGB = [...currentColorRGB];
    const colorInterval = setInterval(() => {
      targetColorRGB = parseRGB(randomColor());
    }, 5000);

    // Initial shape parameters.
    let segments = 120;
    const depthMax = 20;
    const shapeLerpRate = 0.02;
    let shapeOffsets = new Array(segments + 1)
      .fill(0)
      .map(() => Math.random() * depthMax);
    let targetOffsets = new Array(segments + 1)
      .fill(0)
      .map(() => Math.random() * depthMax);
    const shapeInterval = setInterval(() => {
      for (let i = 0; i <= segments; i++) {
        targetOffsets[i] = Math.random() * depthMax;
      }
    }, 3000);

    // Base pop parameters (reduced boost).
    let popMagnitude = 1;
    let targetPopMagnitude = 1;
    const popInterval = setInterval(() => {
      targetPopMagnitude = Math.random() * 0.5 + 0.8;
    }, 10000);

    // Very fast beat: every 150ms.
    // With a 30% chance, boost popMagnitude moderately.
    // With a 40% chance, reinitialize shape parameters.
    const fastBeatInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        targetPopMagnitude = Math.random() * 0.2 + 1.3;
      }
      if (Math.random() < 0.4) {
        segments = Math.floor(Math.random() * 220) + 80;
        shapeOffsets = new Array(segments + 1)
          .fill(0)
          .map(() => Math.random() * depthMax);
        targetOffsets = new Array(segments + 1)
          .fill(0)
          .map(() => Math.random() * depthMax);
      }
    }, 150);

    let phase = 0;
    const fadeSpeed = 0.05;

    // Subtle shape scale oscillation variables.
    let scaleOsc = 1;
    let targetScaleOsc = 1;

    // Add this above the useEffect (or inside it, before animate) to track ripples:
    const ripples = [];

    // Add this at the top inside your useEffect (before animate) to initialize particles:
    let bgParticles = [];
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      bgParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        brightness: Math.random() * 0.5 + 0.5,
        velocityX: (Math.random() - 0.5) * 0.2,
        velocityY: (Math.random() - 0.5) * 0.2,
      });
    }

    // Animate loop.
    const animate = () => {
      if (!isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      phase += 0.005;
      // Oscillate scale subtly over time.
      targetScaleOsc = 1 + 0.02 * Math.sin(phase * 2);
      scaleOsc = lerp(scaleOsc, targetScaleOsc, 0.02);

      ctx.fillStyle = "rgba(0, 0, 0, 0.2)"; // Adjust the alpha to control trail length.
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- Shake Effect --- //
      let shakeX = 0;
      let shakeY = 0;
      // Only apply a shake if popMagnitude is above a threshold.
      if (popMagnitude > 1.3) {
        const shakeIntensity = (popMagnitude - 1.3) * 10; // Adjust multiplier as needed.
        shakeX = (Math.random() - 0.5) * shakeIntensity;
        shakeY = (Math.random() - 0.5) * shakeIntensity;
      }
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Update color.
      currentColorRGB = currentColorRGB.map((c, i) =>
        lerp(c, targetColorRGB[i], fadeSpeed)
      );
      let currentColor = rgbToString(currentColorRGB);
      popMagnitude = lerp(popMagnitude, targetPopMagnitude, 0.02);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius =
        (Math.min(canvas.width, canvas.height) / 4) * popMagnitude * scaleOsc; // Apply subtle scale oscillation.

      // Draw main shape.
      ctx.save();
      ctx.beginPath();
      let points = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        shapeOffsets[i] = lerp(
          shapeOffsets[i],
          targetOffsets[i],
          shapeLerpRate
        );
        const offset = Math.sin(angle * 3 + phase) * shapeOffsets[i];
        const radius = baseRadius + offset;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        points.push({ x, y, angle, radius });
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 4;
      ctx.shadowColor = currentColor;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.restore();

      // Draw bleeding radial lines.
      ctx.save();
      points.forEach(({ x, y, angle, radius }) => {
        const bleedingLength = 15;
        const x2 = centerX + (radius + bleedingLength) * Math.cos(angle);
        const y2 = centerY + (radius + bleedingLength) * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      ctx.restore();

      // Draw outer record border.
      const recordBorderRadius = baseRadius / 2.5; // Adjust as needed.
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, recordBorderRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = "#222"; // Record base color.
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#444"; // Record groove/stroke.
      ctx.stroke();
      ctx.restore();

      // Draw inner circle with album cover ("label").
      const innerRadius = baseRadius / 3; // Inner label radius.
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(phase);
      ctx.beginPath();
      ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      if (albumImgRef.current && albumImgRef.current.complete) {
        ctx.drawImage(
          albumImgRef.current,
          -innerRadius,
          -innerRadius,
          2 * innerRadius,
          2 * innerRadius
        );
      } else {
        ctx.fillStyle = currentColor;
        ctx.fill();
      }
      ctx.restore();

      // --- Add Ripple Effect --- //
      // Create a new ripple if popMagnitude is high, there are less than 5 ripples, and randomly (30% chance).
      if (popMagnitude > 1.4 && ripples.length < 5 && Math.random() < 0.3) {
        // Start the ripple at the outer edge of the main shape.
        const startRadius = baseRadius + Math.random() * 5;
        const startAlpha = 0.8 + Math.random() * 0.2; // Random alpha between 0.8 and 1.
        ripples.push({ radius: startRadius, alpha: startAlpha });
      }

      // Update and draw each ripple.
      ctx.save();
      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        // Increase the ripple's radius and fade it.
        ripple.radius += 4;
        ripple.alpha -= 0.02;
        if (ripple.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        // Match the ripple color with currentColor by converting it to rgba.
        const rippleColor = currentColor
          .replace("rgb(", "rgba(")
          .replace(")", `,${ripple.alpha})`);
        ctx.beginPath();
        ctx.arc(centerX, centerY, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = rippleColor;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();

      // ----- Dynamic Color Transitions & Geometric Layering ----- //

      // Update color dynamically. (Assuming currentColorRGB and targetColorRGB are already used.)
      currentColorRGB = currentColorRGB.map((c, i) =>
        lerp(c, targetColorRGB[i], fadeSpeed)
      );
      currentColor = rgbToString(currentColorRGB);

      // Add an extra geometric layer: a rotating spiral vortex that starts outside the album cover.
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(phase * 0.8);

      ctx.beginPath();
      const spiralTurns = 3; // Number of spiral turns.
      const maxRadius = baseRadius * 0.8; // Maximum radius for the spiral.
      // Offset so that the spiral starts a bit outside the album cover.
      const spiralOffset = innerRadius + 20; // Adjust this offset as needed.
      for (let angle = 0; angle < spiralTurns * Math.PI * 2; angle += 0.1) {
        // The radius now grows from spiralOffset outward.
        const radius =
          spiralOffset +
          ((maxRadius - spiralOffset) / (spiralTurns * Math.PI * 2)) * angle;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (angle === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = currentColor;
      ctx.stroke();
      ctx.restore();

      // Continue with the vignette overlay.
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        Math.min(canvas.width, canvas.height) / 4,
        centerX,
        centerY,
        Math.max(canvas.width, canvas.height) / 1.5
      );
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Then, inside your animate loop add the background drawing effect:
      bgParticles.forEach((p) => {
        // Update particle position.
        p.x += p.velocityX;
        p.y += p.velocityY;
        // Wrap around the canvas edges.
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle as a soft glowing dot.
        ctx.save();
        const gradient = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          p.size
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${p.brightness})`);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      clearInterval(colorInterval);
      clearInterval(shapeInterval);
      clearInterval(popInterval);
      clearInterval(fastBeatInterval);
      cancelAnimationFrame(animationRef.current);
    };
  }, []); // run once

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
            <div className="flex space-x-2 mt-2">
              <button
                onClick={handlePrev}
                className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full"
              >
                <FaBackward size={20} />
              </button>
              <button
                onClick={handlePlayPause}
                className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full"
              >
                {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
              </button>
              <button
                onClick={handleNext}
                className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full"
              >
                <FaForward size={20} />
              </button>
            </div>
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

Visualizer.propTypes = {
  track: PropTypes.shape({
    is_playing: PropTypes.bool,
    item: PropTypes.shape({
      name: PropTypes.string,
      artists: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
        })
      ),
      album: PropTypes.shape({
        images: PropTypes.arrayOf(
          PropTypes.shape({
            url: PropTypes.string,
          })
        ),
      }),
    }),
  }),
  token: PropTypes.string,
};

export default Visualizer;
