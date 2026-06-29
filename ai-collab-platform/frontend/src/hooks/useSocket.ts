import { io, Socket } from 'socket.io-client';

const SOCKET_URL = window.location.origin.replace('3000', '3699') || 'http://localhost:3699';

export const useSocket = () => {
  const socket = io(SOCKET_URL, {
    path: '/ws/socket.io',
    transports: ['websocket'],
  });

  return socket;
};
