import { useState, useEffect } from "react";
import SpotifyAuth from "./SpotifyAuth";
import Visualizer from "./Visualizer";

const App = () => {
  const [token, setToken] = useState("");
  const [track, setTrack] = useState(null);

  useEffect(() => {
    // Check for token in URL hash or localStorage
    const hash = window.location.hash;
    let tokenFromHash = window.localStorage.getItem("spotify_token");
    if (!tokenFromHash && hash) {
      const parsedToken = hash
        .substring(1)
        .split("&")
        .find((elem) => elem.startsWith("access_token"))
        .split("=")[1];
      tokenFromHash = parsedToken;
      window.location.hash = "";
      window.localStorage.setItem("spotify_token", tokenFromHash);
    }
    setToken(tokenFromHash);

  }, []);
    

  // Optional: You can remove polling if you rely solely on real-time events.
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
        // A 204 status means no content (nothing is playing)
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

    // Poll every 5 seconds (optional if you are using real-time events for reliability)
    fetchCurrentTrack(); 
    const interval = setInterval(fetchCurrentTrack, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    setToken("");
    window.localStorage.removeItem("spotify_token");
  };

  return (
    <div className="min-h-screen relative">
      {!token ? (
        <SpotifyAuth />
      ) : (
        <>
          <button
            className="absolute top-5 right-5 px-4 py-2 bg-green-500 text-white rounded-full"
            onClick={handleLogout}
          >
            Logout
          </button>
          <Visualizer track={track} token={token} />
        </>
      )}
    </div>
  );
};

export default App;
