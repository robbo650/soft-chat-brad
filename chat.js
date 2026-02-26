const { createClient } = supabase;

const supabaseUrl = "https://ogvhrkptvvtiddqumdqh.supabase.co"; 
const supabaseKey = "sb_publishable_Uu2hqzHDVy4ds2xc-quI8g_jceg9J3C"; 
const supabaseClient = createClient(supabaseUrl, supabaseKey);

let conversaId = null;
const clienteId = crypto.randomUUID(); 
const protocolo = gerarProtocolo();    

function gerarProtocolo() {
  const agora = new Date();
  const protocolo = agora.getFullYear().toString().slice(-2) +
                    (agora.getMonth()+1).toString().padStart(2,"0") +
                    agora.getDate().toString().padStart(2,"0") +
                    agora.getHours().toString().padStart(2,"0") +
                    agora.getMinutes().toString().padStart(2,"0") +
                    agora.getSeconds().toString().padStart(2,"0") +
                    Math.floor(Math.random()*1000).toString().padStart(3,"0");
  return protocolo; 
}

function saudacaoHorario() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia,";
  if (hora < 18) return "Boa tarde,";
  return "Boa noite,";
}

async function iniciarConversa() {
  const { data, error } = await supabaseClient
    .from('conversas')
    .insert([{ cliente_id: clienteId, criado_em: new Date().toISOString() }])
    .select();

  if (error) {
    console.error("Erro ao iniciar conversa:", error);
    return;
  }

  conversaId = data[0].id;

  const mensagemInicial = `${saudacaoHorario()}
Bem-vindo ao atendimento seguro.
Protocolo: ${protocolo}
Por favor, digite seu primeiro nome.`;

  await supabaseClient.from('mensagens').insert([
    {
      conversa_id: conversaId,
      remetente: "sistema",
      mensagem: mensagemInicial,
      criado_em: new Date().toISOString()
    }
  ]);

  const chatBox = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.classList.add("mensagem", "mensagem-sistema");
  div.innerHTML = `<p>${mensagemInicial.replace(/\n/g,"<br>")}</p><small>${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}</small>`;
  chatBox.appendChild(div);
}

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

  if (!error) {
    const chatBox = document.getElementById("chat-box");
    const div = document.createElement("div");
    div.classList.add("mensagem", "mensagem-cliente");
    div.innerHTML = `<p>${texto}</p><small>${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}</small>`;
    chatBox.appendChild(div);
  }
}

document.getElementById("enviarMensagem").addEventListener("click", () => {
  const input = document.getElementById("mensagem");
  const texto = input.value.trim();
  if (texto) {
    enviarMensagem(texto);
    input.value = "";
  }
});

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
        div.innerHTML = `
          <img src="avatar.png" class="avatar">
          <div>
            <p>${payload.new.mensagem}</p>
            <small>${new Date(payload.new.criado_em).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}</small>
          </div>
        `;
        chatBox.appendChild(div);
      }
    }
  )
  .subscribe();

window.onload = async () => {
  await iniciarConversa();
};
