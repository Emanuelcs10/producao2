import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { codigo, padrao1, qtd_matrizes, dados_matrizaria } = req.body;

      // salvar programa
      const { error: erroPrograma } = await supabase
        .from("programas")
        .upsert({ codigo, padrao1, qtd_matrizes });
      if (erroPrograma) throw erroPrograma;

      // salvar matrizaria
      for (const item of dados_matrizaria) {
        const { error: erroMatriz } = await supabase
          .from("matrizaria")
          .upsert({
            programa_codigo: codigo,
            numeracao: item.numeracao,
            matrizes: item.matrizes,
            giros_inicial: item.girosInicial
          });
        if (erroMatriz) throw erroMatriz;
      }

      res.status(200).json({ message: "Programa salvo com sucesso!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao salvar programa: " + err.message });
    }
  } else {
    res.status(405).json({ error: "Método não permitido" });
  }
}
