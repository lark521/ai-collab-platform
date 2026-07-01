import { io, Socket } from 'socket.io-client';

const SOCKET_URL = window.location.origin.replace('3000', '3699') || 'http://localhost:3699';

export const useSocket = () => {
  const socket = io(window.location.origin.replace('3000', '3699'), {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  return socket;
};
