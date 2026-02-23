import { useEffect } from 'react';
import { useSocket } from '../providers/socket-provider';

export function useRealtime<T = unknown>(
  eventType: string,
  callback: (data: T) => void,
): void {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handler = (data: T) => {
      callback(data);
    };

    socket.on(eventType, handler);
    return () => {
      socket.off(eventType, handler);
    };
  }, [socket, eventType, callback]);
}
