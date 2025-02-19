import { useState, useEffect } from "react";
import SpotifyAuth from "./SpotifyAuth";
import Visualizer from "./Visualizer";
import { FaPowerOff } from "react-icons/fa";

const App = () => {
  const [token, setToken] = useState("");
  const [track, setTrack] = useState(null);

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

  // Poll for the currently playing track.
  useEffect(() => {
    if (!token) return;
    const fetchCurrentTrack = async () => {
      try {
        const res = await fetch(
          "https://api.spotify.com/v1/me/player/currently-playing",
          {
            headers: { Authorization: "Bearer " + token },
          }
        );
        if (res.status === 204 || res.status > 400) {
          setTrack(null);
          return;
        }
        const data = await res.json();
        setTrack(data);
      } catch (error) {
        console.error(error);
        setTrack(null);
      }
    };

    fetchCurrentTrack();
    const interval = setInterval(fetchCurrentTrack, 5000);
    return () => clearInterval(interval);
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
