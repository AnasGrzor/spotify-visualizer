import { useRef, useState, useEffect } from "react";
import { FaBackward, FaPlay, FaPause, FaForward, FaBars } from "react-icons/fa";
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

  // Effects toggles.
  const [glitchEnabled, setGlitchEnabled] = useState(false);
  const [distortionEnabled, setDistortionEnabled] = useState(false);
  const [noiseEnabled, setNoiseEnabled] = useState(false);
  const [colorShiftEnabled, setColorShiftEnabled] = useState(false);
  const [layeredDistortionsEnabled, setLayeredDistortionsEnabled] =
    useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Refs for the toggle states.
  const glitchEnabledRef = useRef(glitchEnabled);
  const distortionEnabledRef = useRef(distortionEnabled);
  const noiseEnabledRef = useRef(noiseEnabled);
  const colorShiftEnabledRef = useRef(colorShiftEnabled);
  const layeredDistortionsEnabledRef = useRef(layeredDistortionsEnabled);

  // Create a ref for the offscreen noise canvas.
  const noiseCanvasRef = useRef(document.createElement("canvas"));

  // Update the refs when state changes.
  useEffect(() => {
    glitchEnabledRef.current = glitchEnabled;
  }, [glitchEnabled]);
  useEffect(() => {
    distortionEnabledRef.current = distortionEnabled;
  }, [distortionEnabled]);
  useEffect(() => {
    noiseEnabledRef.current = noiseEnabled;
  }, [noiseEnabled]);
  useEffect(() => {
    colorShiftEnabledRef.current = colorShiftEnabled;
  }, [colorShiftEnabled]);
  useEffect(() => {
    layeredDistortionsEnabledRef.current = layeredDistortionsEnabled;
  }, [layeredDistortionsEnabled]);

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
      albumImgRef.current.crossOrigin = "Anonymous";
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

    // Color cycling.
    let currentColorRGB = parseRGB(randomColor());
    let targetColorRGB = [...currentColorRGB];
    const colorInterval = setInterval(() => {
      targetColorRGB = parseRGB(randomColor());
    }, 5000);

    // Shape parameters.
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

    // Pop parameters.
    let popMagnitude = 1;
    let targetPopMagnitude = 1;
    const popInterval = setInterval(() => {
      targetPopMagnitude = Math.random() * 0.5 + 0.8;
    }, 10000);

    // Fast beat: every 150ms.
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
    let scaleOsc = 1;
    let targetScaleOsc = 1;
    const ripples = [];

    // Background particles.
    let bgParticles = [];
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      bgParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        brightness: Math.random() * 0.5 + 0.5,
        depth: Math.random() * 0.7 + 0.3,
        velocityX: (Math.random() - 0.5) * 0.2,
        velocityY: (Math.random() - 0.5) * 0.2,
      });
    }

    let shootingStars = [];
    let vortexAlpha = 1;

    const animate = () => {
      if (!isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      phase += 0.005;
      targetScaleOsc = 1 + 0.02 * Math.sin(phase * 2);
      scaleOsc = lerp(scaleOsc, targetScaleOsc, 0.02);

      // ----- Adaptive Trailing Effect ----- //
      const clampedPop = Math.max(1, Math.min(popMagnitude, 2));
      const trailAlpha = lerp(0.1, 0.3, (clampedPop - 1) / 1);
      ctx.fillStyle = `rgba(0, 0, 0, ${trailAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ----- Shake Effect ----- //
      let shakeX = 0;
      let shakeY = 0;
      if (popMagnitude > 1.3) {
        const shakeIntensity = (popMagnitude - 1.3) * 10;
        shakeX = (Math.random() - 0.5) * shakeIntensity;
        shakeY = (Math.random() - 0.5) * shakeIntensity;
      }
      ctx.save();
      ctx.translate(shakeX, shakeY);

      currentColorRGB = currentColorRGB.map((c, i) =>
        lerp(c, targetColorRGB[i], fadeSpeed)
      );
      let currentColor = rgbToString(currentColorRGB);
      popMagnitude = lerp(popMagnitude, targetPopMagnitude, 0.02);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius =
        (Math.min(canvas.width, canvas.height) / 4) * popMagnitude * scaleOsc;

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
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
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
      const recordBorderRadius = baseRadius / 2.5;
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, recordBorderRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = "#222";
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#444";
      ctx.stroke();
      ctx.restore();

      // Draw inner circle with album cover.
      const innerRadius = baseRadius / 3;
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

      // ----- Add Ripple Effect ----- //
      if (popMagnitude > 1.4 && ripples.length < 5 && Math.random() < 0.3) {
        const startRadius = baseRadius + Math.random() * 5;
        const startAlpha = 0.8 + Math.random() * 0.2;
        ripples.push({ radius: startRadius, alpha: startAlpha });
      }
      ctx.save();
      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        ripple.radius += 4;
        ripple.alpha -= 0.02;
        if (ripple.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
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
      currentColorRGB = currentColorRGB.map((c, i) =>
        lerp(c, targetColorRGB[i], fadeSpeed)
      );
      currentColor = rgbToString(currentColorRGB);

      // ----- Enhanced Spiral Vortex Effect with Evaporation & Minimal Colors ----- //
      vortexAlpha = popMagnitude > 1.4 ? 1 : vortexAlpha * 0.98;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(phase * 0.8);
      ctx.globalAlpha = vortexAlpha;
      ctx.beginPath();
      const spiralTurns = 3;
      const maxRadiusSpiral = baseRadius * 0.8;
      const spiralOffset = innerRadius + 20;
      for (let angle = 0; angle < spiralTurns * Math.PI * 2; angle += 0.1) {
        const radius =
          spiralOffset +
          ((maxRadiusSpiral - spiralOffset) / (spiralTurns * Math.PI * 2)) *
            angle;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        angle === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = currentColor;
      ctx.stroke();
      ctx.restore();

      // ----- Enhanced Layered Spiral Vortex with Minimal Colors & Glitch Effects ----- //
      ctx.save();
      ctx.translate(centerX, centerY);
      for (let layer = 0; layer < 2; layer++) {
        ctx.save();
        ctx.rotate(phase * (0.8 + layer * 0.1));
        ctx.beginPath();
        const layerSpiralTurns = 3;
        const layerMaxRadius = baseRadius * 0.8;
        const layerSpiralOffset = innerRadius + 20 + layer * 10;
        for (
          let angle = 0;
          angle < layerSpiralTurns * Math.PI * 2;
          angle += 0.05
        ) {
          const radius =
            layerSpiralOffset +
            ((layerMaxRadius - layerSpiralOffset) /
              (layerSpiralTurns * Math.PI * 2)) *
              angle;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          angle === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        const hue = Math.floor((phase * 100) % 360);
        const complementaryHue = (hue + 180) % 360;
        const gradient = ctx.createRadialGradient(
          0,
          0,
          layerSpiralOffset,
          0,
          0,
          layerMaxRadius
        );
        if (layer === 0) {
          gradient.addColorStop(0, `hsla(${hue}, 50%, 50%, 0.8)`);
          gradient.addColorStop(1, `hsla(${hue}, 50%, 50%, 0)`);
        } else {
          gradient.addColorStop(0, `hsla(${complementaryHue}, 50%, 50%, 0.8)`);
          gradient.addColorStop(1, `hsla(${complementaryHue}, 50%, 50%, 0)`);
        }
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3 + layer * 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = gradient;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // ----- Distortion Effect (Fully On or Off) ----- //
      if (distortionEnabledRef.current) {
        const sliceHeight = 10;
        for (let y = 0; y < canvas.height; y += sliceHeight) {
          const offset =
            20 * Math.sin((y / canvas.height) * Math.PI * 2 + phase * 3);
          const slice = ctx.getImageData(0, y, canvas.width, sliceHeight);
          ctx.putImageData(slice, offset, y);
        }
      }

      // ----- Glitch Effect (Fully On or Off) ----- //
      if (glitchEnabledRef.current) {
        const glitchWidth = 100;
        const glitchHeight = 200;
        const glitchX = Math.random() * (canvas.width - glitchWidth);
        const glitchY = Math.random() * (canvas.height - glitchHeight);
        const offsetX = Math.random() * 20 - 10;
        const offsetY = Math.random() * 20 - 10;
        const imageData = ctx.getImageData(
          glitchX,
          glitchY,
          glitchWidth,
          glitchHeight
        );
        ctx.putImageData(imageData, glitchX + offsetX, glitchY + offsetY);
      }

      // ----- Noise Overlay ----- //
      if (noiseEnabledRef.current) {
        // Create an offscreen canvas.
        const offCanvas = document.createElement("canvas");
        offCanvas.width = canvas.width;
        offCanvas.height = canvas.height;
        const offCtx = offCanvas.getContext("2d");

        // Generate noise image data on the offscreen canvas.
        const noiseImageData = offCtx.createImageData(
          canvas.width,
          canvas.height
        );
        const buffer = noiseImageData.data;
        for (let i = 0; i < buffer.length; i += 4) {
          const val = Math.floor(Math.random() * 5); // Lower noise intensity
          buffer[i] = val; // R
          buffer[i + 1] = val; // G
          buffer[i + 2] = val; // B
          buffer[i + 3] = 50; // Alpha in the noise image data
        }
        offCtx.putImageData(noiseImageData, 0, 0);

        // Draw the noise offscreen canvas on the main canvas
        // with a low globalAlpha to blend with existing visuals.
        ctx.save();
        ctx.globalAlpha = 0.1; // Adjust overall visibility of the noise overlay
        ctx.drawImage(offCanvas, 0, 0);
        ctx.restore();
      }

      // ----- Color Shift Overlay ----- //
      if (colorShiftEnabledRef.current) {
        const shiftAmount = Math.sin(phase) * 10; // shift in degrees
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = `hsla(${shiftAmount}, 100%, 50%, 0.05)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // ----- Layered Distortion Effect ----- //
      if (layeredDistortionsEnabledRef.current) {
        const sliceHeight2 = 20;
        for (let y = 0; y < canvas.height; y += sliceHeight2) {
          const offset2 =
            10 * Math.sin((y / canvas.height) * Math.PI * 2 + phase * 5);
          const slice = ctx.getImageData(0, y, canvas.width, sliceHeight2);
          ctx.putImageData(slice, offset2, y);
        }
      }

      // ----- Background Effects ----- //
      const gradientBg = ctx.createRadialGradient(
        centerX,
        centerY,
        Math.min(canvas.width, canvas.height) / 4,
        centerX,
        centerY,
        Math.max(canvas.width, canvas.height) / 1.5
      );
      gradientBg.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradientBg.addColorStop(1, "rgba(0, 0, 0, 0.4)");
      ctx.fillStyle = gradientBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background particles with depth/parallax.
      bgParticles.forEach((p) => {
        p.x += p.velocityX * p.depth;
        p.y += p.velocityY * p.depth;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.save();
        const adjustedSize = p.size * p.depth;
        const adjustedBrightness = p.brightness * (0.5 + p.depth);
        const particleGradient = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          adjustedSize
        );
        particleGradient.addColorStop(
          0,
          `rgba(255, 255, 255, ${adjustedBrightness})`
        );
        particleGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = particleGradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, adjustedSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ----- Shooting Stars Effect ----- //
      if (Math.random() < 0.005) {
        const startX = Math.random() * canvas.width;
        const startY = 0;
        const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.2;
        const speed = Math.random() * 5 + 5;
        shootingStars.push({
          x: startX,
          y: startY,
          angle: angle,
          velocityX: speed * Math.cos(angle),
          velocityY: speed * Math.sin(angle),
          length: Math.random() * 50 + 60,
          alpha: 1.0,
        });
      }
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i];
        star.x += star.velocityX;
        star.y += star.velocityY;
        star.alpha -= 0.02;
        if (
          star.alpha <= 0 ||
          star.x > canvas.width ||
          star.y > canvas.height
        ) {
          shootingStars.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        const tailX = star.x - star.length * Math.cos(star.angle);
        const tailY = star.y - star.length * Math.sin(star.angle);
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

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

  // Update noise canvas every 500ms.
  useEffect(() => {
    const canvas = canvasRef.current;
    const updateNoise = () => {
      const noiseCanvas = noiseCanvasRef.current;
      noiseCanvas.width = canvas.width;
      noiseCanvas.height = canvas.height;
      const noiseCtx = noiseCanvas.getContext("2d");
      const noiseImageData = noiseCtx.createImageData(
        noiseCanvas.width,
        noiseCanvas.height
      );
      const buffer = noiseImageData.data;
      for (let i = 0; i < buffer.length; i += 4) {
        // Use low noise intensity to keep it subtle.
        const val = Math.floor(Math.random() * 5);
        buffer[i] = val; // R
        buffer[i + 1] = val; // G
        buffer[i + 2] = val; // B
        buffer[i + 3] = 50; // Alpha in the noise image data
      }
      noiseCtx.putImageData(noiseImageData, 0, 0);
    };

    updateNoise();
    const noiseInterval = setInterval(updateNoise, 500);
    return () => clearInterval(noiseInterval);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Hamburger icon */}
      <button
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="absolute top-4 left-4 z-30 p-2 bg-gray-900 opacity-25 hover:opacity-100 text-white rounded"
      >
        <FaBars size={24} />
      </button>

      {/* Sidebar Effects Panel */}
      {sidebarOpen && (
        <div className="absolute top-10 left-0 m-4 p-4 bg-gray-900 bg-opacity-70 text-white z-20 rounded">
          <h3 className="font-bold mb-2 text-lg">Effects</h3>
          <label className="block">
            <input
              type="checkbox"
              checked={glitchEnabled}
              onChange={(e) => setGlitchEnabled(e.target.checked)}
              className="mr-2"
            />
            Glitch Effect
          </label>
          <label className="block mt-2">
            <input
              type="checkbox"
              checked={distortionEnabled}
              onChange={(e) => setDistortionEnabled(e.target.checked)}
              className="mr-2"
            />
            Distortion Effect
          </label>
          <label className="block mt-2">
            <input
              type="checkbox"
              checked={noiseEnabled}
              onChange={(e) => setNoiseEnabled(e.target.checked)}
              className="mr-2"
            />
            Noise Overlay
          </label>
          <label className="block mt-2">
            <input
              type="checkbox"
              checked={colorShiftEnabled}
              onChange={(e) => setColorShiftEnabled(e.target.checked)}
              className="mr-2"
            />
            Color Shift
          </label>
          <label className="block mt-2">
            <input
              type="checkbox"
              checked={layeredDistortionsEnabled}
              onChange={(e) => setLayeredDistortionsEnabled(e.target.checked)}
              className="mr-2"
            />
            Layered Distortions
          </label>
        </div>
      )}

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
        // When no song is playing, center an animated message with a pulsing effect.
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <h1 className="animate-pulse text-4xl font-bold text-white mb-4">
            No song playing
          </h1>
          {/* A pulsing circle as an ambient effect */}
          <div className="w-24 h-24 bg-white rounded-full animate-ping"></div>
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
