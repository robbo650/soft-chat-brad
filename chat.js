const { createClient } = supabase;

const supabaseUrl = "https://robbo650.supabase.co";
const supabaseKey = "sb_publishable_Uu2hqzHDVy4ds2xc-quI8g_jceg9J3C";
const supabaseClient = createClient(supabaseUrl, supabaseKey);

let conversaId = null;

// Criar nova conversa ao abrir
async function iniciarConversa() {
  const { data, error } = await supabaseClient
    .from('conversas')
    .insert([{ cliente_id: "cliente", criado_em: new Date().toISOString() }])
    .select();

  if (error) {
    console.error("Erro ao iniciar conversa:", error);
    return;
  }

  conversaId = data[0].id;
}

// Enviar mensagem do cliente
async function enviarMensagem(texto) {
  if (!conversaId) {
    await iniciarConversa();
  }

  const { error } = await supabaseClient.from('mensagens').insert([
    {
      conversa_id: conversaId,
      remetente: "cliente",
      mensagem: texto,
      criado_em: new Date().toISOString()
    }
  ]);

  if (error) {
    console.error("Erro ao enviar mensagem:", error);
  } else {
    const chatBox = document.getElementById("chat-box");
    const div = document.createElement("div");
    div.classList.add("mensagem", "mensagem-cliente");
    div.innerHTML = `<p>${texto}</p><small>${new Date().toLocaleTimeString("pt-BR")}</small>`;
    chatBox.appendChild(div);
  }
}

// Configura botão
document.getElementById("enviarMensagem").addEventListener("click", () => {
  const input = document.getElementById("mensagem");
  const texto = input.value.trim();
  if (texto) {
    enviarMensagem(texto);
    input.value = "";
  }
});

// Enter também envia
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

// Tempo real: ouvir respostas do atendente
supabaseClient
  .channel('mensagens')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'mensagens' },
    (payload) => {
      if (payload.new.remetente === "atendente" && payload.new.conversa_id === conversaId) {
        const chatBox = document.getElementById("chat-box");
        const div = document.createElement("div");
        div.classList.add("mensagem", "mensagem-admin");
        div.innerHTML = `<p>${payload.new.mensagem}</p><small>${new Date(payload.new.criado_em).toLocaleTimeString("pt-BR")}</small>`;
        chatBox.appendChild(div);
      }
    }
  )
  .subscribe();

// Inicia conversa ao abrir
window.onload = async () => {
  await iniciarConversa();
};
