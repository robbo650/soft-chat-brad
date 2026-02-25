const { createClient } = supabase;

const supabaseUrl = "https://robbo650.supabase.co";
const supabaseKey = "sb_publishable_Uu2hqzHDVy4ds2xc-quI8g_jceg9J3C";
const supabaseClient = createClient(supabaseUrl, supabaseKey);

let conversaSelecionada = null;

// Carregar conversas existentes
async function carregarConversas() {
  const { data, error } = await supabaseClient
    .from('conversas')
    .select('*')
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
    selecionarConversa(conversaSelecionada); // recarrega mensagens
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
      if (payload.new.remetente === "cliente" && payload.new.conversa_id === conversaSelecionada) {
        selecionarConversa(conversaSelecionada);
      }
    }
  )
  .subscribe();

// Carregar conversas ao abrir
window.onload = async () => {
  await carregarConversas();

  const { data, error } = await supabaseClient
    .from('conversas')
    .select('id')
    .order('criado_em', { ascending: false })
    .limit(1);

  if (!error && data.length > 0) {
    conversaSelecionada = data[0].id;
    selecionarConversa(conversaSelecionada);
  }
};