import { useState, useEffect } from "react";

const useWebSocket = () => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("ws://7.tcp.eu.ngrok.io:13905");
    setSocket(ws);

    ws.onopen = () => {
      console.log("WebSocket connection opened");
    };

    ws.onmessage = (event) => {
      setMessage(event.data);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setSocket(null);
    };

    return () => {
      ws.close();
    };
  }, []);

  return [socket, message];
};

export default useWebSocket;
