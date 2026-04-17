import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

let socketGlobal = null

function getSocket() {
  if (!socketGlobal) {
    socketGlobal = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
    })
  }
  return socketGlobal
}

export function useSocket(handlers = {}) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const socket = getSocket()

    const wrap = (nome, fn) => (...args) => fn(...args)

    const listeners = Object.entries(handlersRef.current).map(([evento, fn]) => {
      const wrapped = wrap(evento, fn)
      socket.on(evento, wrapped)
      return [evento, wrapped]
    })

    return () => {
      listeners.forEach(([evento, wrapped]) => socket.off(evento, wrapped))
    }
  }, [])

  const emit = useCallback((evento, dados) => {
    getSocket().emit(evento, dados)
  }, [])

  return { emit, socket: getSocket() }
}
