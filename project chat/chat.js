// Usando Supabase via CDN
const { createClient } = supabase;

const supabaseUrl = "https://robbo650.supabase.co";
const supabaseKey = "sb_publishable_Uu2hqzHDVy4ds2xc-quI8g_jceg9J3C";
const supabaseClient = createClient(supabaseUrl, supabaseKey);

let conversaId = null;

// Função para gerar número de protocolo único (usado como cliente_id)
function gerarProtocolo() {
  const agora = Date.now();
  const aleatorio = Math.floor(Math.random() * 1000000);
  return `${agora}${aleatorio}`;
}

// Renderizar mensagem no chat
function renderMensagem(msg) {
  const div = document.createElement('div');
  div.classList.add('mensagem');

  if (msg.remetente === "cliente") {
    div.classList.add('mensagem-cliente');
  } else if (msg.remetente === "atendente") {
    div.classList.add('mensagem-admin');
  } else {
    div.classList.add('mensagem-sistema');
  }

  const dataHora = new Date(msg.criado_em).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  div.innerHTML = `
    <p>${msg.mensagem}</p>
    <small>${dataHora}</small>
  `;

  const chatBox = document.getElementById("chat");
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Criar conversa automática ao abrir o chat
async function criarConversa() {
  const protocolo = gerarProtocolo();
  const { data, error } = await supabaseClient
    .from('conversas')
    .insert([{ cliente_id: protocolo }]) // usa cliente_id em vez de protocolo
    .select();

  if (!error && data.length > 0) {
    conversaId = data[0].id; // uuid da conversa
  } else {
    console.error("Erro ao criar conversa:", error);
  }

  // mostra saudação uma vez
  renderMensagem({
    remetente: "Sistema",
    mensagem: `👋 Bem-vindo à Central de Atendimento! Seu número de protocolo é: ${protocolo}`,
    criado_em: new Date().toISOString()
  });
}

// Enviar mensagem do cliente
async function enviarMensagem(texto) {
  // renderiza imediatamente
  renderMensagem({
    remetente: "cliente",
    mensagem: texto,
    criado_em: new Date().toISOString()
  });

  if (!conversaId) {
    console.warn("Conversa ainda não criada, aguardando...");
    return;
  }

  const { error } = await supabaseClient.from('mensagens').insert([
    {
      conversa_id: conversaId, // uuid
      remetente: "cliente",
      mensagem: texto,
      criado_em: new Date().toISOString()
    }
  ]);

  if (error) {
    console.error("Erro ao enviar mensagem:", error);
  }
}

// Receber mensagens em tempo real (do atendente)
supabaseClient
  .channel('mensagens')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'mensagens' },
    (payload) => {
      if (payload.new.remetente === "atendente") {
        renderMensagem(payload.new);
      }
    }
  )
  .subscribe();

// Configura botão de envio
document.getElementById("enviar").addEventListener("click", () => {
  const input = document.getElementById("mensagem");
  const texto = input.value.trim();
  if (texto) {
    enviarMensagem(texto);
    input.value = "";
  }
});

// Configura envio com Enter
document.getElementById("mensagem").addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const texto = event.target.value.trim();
    if (texto) {
      enviarMensagem(texto);
      event.target.value = "";
    }
  }
});

// Saudação automática ao abrir
window.onload = () => {
  criarConversa();
};
