const { createClient } = supabase;

const supabaseUrl = "https://ogvhrkptvvtiddqumdqh.supabase.co"; // Project URL
const supabaseKey = "sb_publishable_Uu2hqzHDVy4ds2xc-quI8g_jceg9J3C"; // Publishable key (anon)
const supabaseClient = createClient(supabaseUrl, supabaseKey);

let conversaSelecionada = null;

// ⚠️ Defina aqui o UUID do atendente logado (pegue da tabela atendentes)
const atendenteId = "193287e7-45e4-4142-9478-0c3cf8a8db5f"; // exemplo Brad 01

// Carregar conversas sem atendente
async function carregarConversas() {
  const { data, error } = await supabaseClient
    .from('conversas')
    .select('*')
    .is('atendente_id', null) // só mostra conversas pendentes
    .order('criado_em', { ascending: false });

  if (error) {
    console.error("Erro ao carregar conversas:", error);
    return;
  }

  const lista = document.getElementById("lista-conversas");
  lista.innerHTML = "";

  data.forEach(conv => {
    const div = document.createElement("div");
    div.classList.add("mensagem-sistema");
    div.innerHTML = `Cliente: ${conv.cliente_id}`;
    div.style.cursor = "pointer";
    div.onclick = () => selecionarConversa(conv.id);
    lista.appendChild(div);
  });
}

// Selecionar conversa e mostrar mensagens
async function selecionarConversa(id) {
  conversaSelecionada = id;

  // vincula atendente à conversa
  await supabaseClient
    .from("conversas")
    .update({ atendente_id: atendenteId })
    .eq("id", id);

  const { data, error } = await supabaseClient
    .from('mensagens')
    .select('*')
    .eq('conversa_id', id)
    .order('criado_em', { ascending: true });

  if (error) {
    console.error("Erro ao carregar mensagens:", error);
    return;
  }

  const mensagensBox = document.getElementById("mensagens");
  mensagensBox.innerHTML = "";
  data.forEach(msg => {
    const div = document.createElement("div");
    div.classList.add("mensagem");
    div.classList.add(msg.remetente === "cliente" ? "mensagem-cliente" : "mensagem-admin");
    div.innerHTML = `<p>${msg.mensagem}</p><small>${new Date(msg.criado_em).toLocaleTimeString("pt-BR")}</small>`;
    mensagensBox.appendChild(div);
  });
}

// Enviar resposta do atendente
async function enviarResposta(texto) {
  if (!conversaSelecionada) {
    alert("Nenhuma conversa selecionada!");
    return;
  }

  const { error } = await supabaseClient.from('mensagens').insert([
    {
      conversa_id: conversaSelecionada,
      remetente: "atendente",
      mensagem: texto,
      criado_em: new Date().toISOString()
    }
  ]);

  if (error) {
    console.error("Erro ao enviar resposta:", error);
  } else {
    const mensagensBox = document.getElementById("mensagens");
    const div = document.createElement("div");
    div.classList.add("mensagem", "mensagem-admin");
    div.innerHTML = `<p>${texto}</p><small>${new Date().toLocaleTimeString("pt-BR")}</small>`;
    mensagensBox.appendChild(div);
  }
}

// Configura botão
document.getElementById("enviarResposta").addEventListener("click", () => {
  const input = document.getElementById("resposta");
  const texto = input.value.trim();
  if (texto) {
    enviarResposta(texto);
    input.value = "";
  }
});

// Enter também envia
document.getElementById("resposta").addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const texto = event.target.value.trim();
    if (texto) {
      enviarResposta(texto);
      event.target.value = "";
    }
  }
});

// Tempo real: ouvir mensagens novas do cliente
supabaseClient
  .channel('mensagens')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'mensagens' },
    (payload) => {
      console.log("Nova mensagem recebida:", payload.new);

      if (payload.new.remetente === "cliente" && payload.new.conversa_id === conversaSelecionada) {
        const mensagensBox = document.getElementById("mensagens");
        const div = document.createElement("div");
        div.classList.add("mensagem", "mensagem-cliente");
        div.innerHTML = `<p>${payload.new.mensagem}</p><small>${new Date(payload.new.criado_em).toLocaleTimeString("pt-BR")}</small>`;
        mensagensBox.appendChild(div);
      }
    }
  )
  .subscribe();

// Carregar conversas ao abrir
window.onload = async () => {
  await carregarConversas();
};
