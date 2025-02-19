import { useState, useEffect } from "react";
import SpotifyAuth from "./SpotifyAuth";
import Visualizer from "./Visualizer";
import { FaPowerOff } from "react-icons/fa";

const App = () => {
  const [token, setToken] = useState("");
  const [track, setTrack] = useState(null);
  const [player, setPlayer] = useState(null);

  // On initial load, extract token and expiry info.
  useEffect(() => {
    const hash = window.location.hash;
    let tokenFromHash = window.localStorage.getItem("spotify_token");
    let expiry = window.localStorage.getItem("spotify_token_expiry");

    if (!tokenFromHash && hash) {
      const params = new URLSearchParams(hash.substring(1));
      tokenFromHash = params.get("access_token");
      const expiresIn = parseInt(params.get("expires_in")); // seconds
      expiry = Date.now() + expiresIn * 1000;
      window.localStorage.setItem("spotify_token", tokenFromHash);
      window.localStorage.setItem("spotify_token_expiry", expiry);
      window.location.hash = "";
    }
    setToken(tokenFromHash);
  }, []);

  // Check for token expiry and log the user out when expired.
  useEffect(() => {
    if (!token) return;
    const checkExpiry = () => {
      const expiryTime = parseInt(
        window.localStorage.getItem("spotify_token_expiry")
      );
      if (Date.now() > expiryTime) {
        console.log("Access token expired. Logging out user.");
        handleLogout();
      }
    };
    const interval = setInterval(checkExpiry, 10000); // check every 10 seconds
    return () => clearInterval(interval);
  }, [token]);

  // Initialize the Spotify Web Playback SDK when the token becomes available.
  useEffect(() => {
    if (!token) return;

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: "Spotify Visualizer Player",
        getOAuthToken: (cb) => {
          cb(token);
        },
        volume: 0.5,
      });

      // Error handling.
      spotifyPlayer.addListener("initialization_error", ({ message }) => {
        console.error(message);
      });
      spotifyPlayer.addListener("authentication_error", ({ message }) => {
        console.error(message);
        handleLogout();
      });
      spotifyPlayer.addListener("account_error", ({ message }) => {
        console.error(message);
      });
      spotifyPlayer.addListener("playback_error", ({ message }) => {
        console.error(message);
      });

      // Ready event.
      spotifyPlayer.addListener("ready", ({ device_id }) => {
        console.log("Ready with Device ID", device_id);
        // Optionally, transfer playback to the new device.
      });

      // Listen for playback status changes.
      spotifyPlayer.addListener("player_state_changed", (state) => {
        if (state && state.track_window && state.track_window.current_track) {
          setTrack(state.track_window.current_track);
        }
      });

      // Connect to the player!
      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };

    return () => {
      document.body.removeChild(script);
      if (player) {
        player.disconnect();
      }
    };
  }, [token]);

  const handleLogout = () => {
    setToken("");
    window.localStorage.removeItem("spotify_token");
    window.localStorage.removeItem("spotify_token_expiry");
  };

  return (
    <div className="min-h-screen relative">
      {!token ? (
        <SpotifyAuth />
      ) : (
        <>
          <button
            className="absolute top-5 right-5 px-4 py-2 bg-green-500 rounded-full cursor-pointer z-10 opacity-25 hover:opacity-100"
            onClick={handleLogout}
          >
            <FaPowerOff size={20} />
          </button>
          <Visualizer track={track} token={token} />
        </>
      )}
    </div>
  );
};

export default App;
