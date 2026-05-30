import { useEffect, useRef } from 'react'

const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
const WS_URL = `${wsProto}//${location.host}`

let socket = null
const listeners = new Set()

function getSocket() {
  if (socket && socket.readyState <= 1) return socket
  socket = new WebSocket(WS_URL)
  socket.onmessage = (e) => {
    try {
      const { channel } = JSON.parse(e.data)
      for (const fn of listeners) fn(channel)
    } catch {}
  }
  socket.onclose = () => { setTimeout(getSocket, 2000) }
  return socket
}

// Appelle `callback(channel)` à chaque broadcast du serveur.
// Si `channels` est fourni, ne déclenche que pour ces canaux.
export function useWs(callback, channels) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    getSocket()
    const handler = (ch) => {
      if (!channels || channels.includes(ch)) cbRef.current(ch)
    }
    listeners.add(handler)
    return () => listeners.delete(handler)
  }, [channels?.join(',')])
}
