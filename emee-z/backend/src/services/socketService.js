// socketService.js — emissão centralizada de eventos Socket.io
// O `io` é injetado uma vez ao inicializar o servidor

let _io = null

function init(io) {
  _io = io
}

function get() {
  return _io
}

function emit(evento, dados) {
  if (!_io) return
  _io.emit(evento, dados)
}

function emitParaSala(sala, evento, dados) {
  if (!_io) return
  _io.to(sala).emit(evento, dados)
}

// Eventos padronizados
const eventos = {
  novaMensagem: (conversa_id, mensagem) =>
    emit('nova_mensagem', { conversa_id, mensagem }),

  conversaAtualizada: (conversa_id, status, agente_id = null) =>
    emit('conversa_atualizada', { conversa_id, status, agente_id }),

  novaConversa: (conversa) =>
    emit('nova_conversa', { conversa }),

  mensagemLida: (mensagem_id, status) =>
    emit('mensagem_lida', { mensagem_id, status }),

  agenteStatus: (agente_id, online) =>
    emit('agente_status', { agente_id, online }),

  instanciaStatus: (instancia_id, status) =>
    emit('instancia_status', { instancia_id, status }),
}

module.exports = { init, get, emit, emitParaSala, ...eventos }
