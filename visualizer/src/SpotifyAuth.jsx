const SpotifyAuth = () => {
    const PORT = 5173;
  // Replace with your own Spotify client ID and redirect URI
  const CLIENT_ID = "6d618041072b4ffb85739332f857cdb3";
  const REDIRECT_URI = `http://localhost:${PORT}/callback`;
  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
  const RESPONSE_TYPE = "token";
  const SCOPE = "user-read-currently-playing user-read-playback-state";

  const loginUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&response_type=${RESPONSE_TYPE}&scope=${encodeURIComponent(SCOPE)}`;

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-white text-4xl font-bold">Spotify Visualizer</h1>
      <a
        className="mt-8 px-6 py-3 bg-green-500 text-white font-semibold rounded-full"
        href={loginUrl}
      >
        Login with Spotify
      </a>
    </div>
  );
};

export default SpotifyAuth;
