let audioCtx: AudioContext | null = null

/**
 * Beep sintetizado (sem depender de um arquivo de áudio). Precisa ser
 * chamado a partir de um gesto do usuário na primeira vez, por causa das
 * políticas de autoplay do navegador.
 */
export function tocarBeep() {
  try {
    audioCtx ??= new AudioContext()
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const agora = audioCtx.currentTime
    ;[0, 0.18].forEach((atraso) => {
      const osc = audioCtx!.createOscillator()
      const gain = audioCtx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0, agora + atraso)
      gain.gain.linearRampToValueAtTime(0.35, agora + atraso + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, agora + atraso + 0.15)
      osc.connect(gain)
      gain.connect(audioCtx!.destination)
      osc.start(agora + atraso)
      osc.stop(agora + atraso + 0.16)
    })
  } catch {
    // navegador sem suporte a Web Audio API — sem alerta sonoro, sem quebrar a página
  }
}
