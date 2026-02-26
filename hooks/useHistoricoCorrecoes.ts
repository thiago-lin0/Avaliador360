import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore'; // <-- AQUI

export interface ProvaFiltro { id_prova: number; titulo: string; }
export interface Correcao { id_folha: any; nota_final: number | null; data_correcao: string | null; status: string | null; id_prova: number | null; tb_aluno: { nome_completo: string } | null; tb_prova: { titulo: string; id_escola: number } | null; }

export function useHistoricoCorrecoes() {
  const { escolaId } = useAuthStore(); // Direto do Zustand

  const [correcoes, setCorrecoes] = useState<Correcao[]>([]);
  const [provasDisponiveis, setProvasDisponiveis] = useState<ProvaFiltro[]>([]);
  const [provaSelecionada, setProvaSelecionada] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarDados = async (idProva: number | null = null) => {
    if (!escolaId) { setLoading(false); return; } // Checagem imediata

    try {
      setLoading(true);

      const { data: fData } = await supabase
        .from('tb_folha_resposta')
        .select(`id_prova, tb_prova!id_prova!inner ( titulo, id_escola )`)
        .eq('tb_prova.id_escola', escolaId)
        .eq('status', 'CORRIGIDA');

      if (fData) {
        const mapa = new Map();
        fData.forEach((item: any) => { if (item.tb_prova) mapa.set(item.id_prova, item.tb_prova.titulo); });
        setProvasDisponiveis(Array.from(mapa.entries()).map(([id, t]) => ({ id_prova: id, titulo: t })));
      }

      let query = supabase
        .from('tb_folha_resposta')
        .select(`id_folha, nota_final, data_correcao, status, tb_aluno!id_aluno ( nome_completo ), tb_prova!id_prova!inner ( titulo, id_escola )`)
        .eq('tb_prova.id_escola', escolaId)
        .eq('status', 'CORRIGIDA')
        .order('data_correcao', { ascending: false });

      if (idProva) query = query.eq('id_prova', idProva);

      const { data, error } = await query.limit(50);
      if (error) throw error;

      if (data) {
        const formatados = data.map(item => ({
          ...item,
          tb_aluno: Array.isArray(item.tb_aluno) ? item.tb_aluno[0] : item.tb_aluno,
          tb_prova: Array.isArray(item.tb_prova) ? item.tb_prova[0] : item.tb_prova
        }));
        setCorrecoes(formatados as any);
      }
    } catch (error: any) { console.error('Erro:', error.message); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { if (escolaId) carregarDados(); }, [escolaId]); // Roda quando a escola carregar

  const onRefresh = () => { setRefreshing(true); carregarDados(provaSelecionada); };
  const handleSelecionarProva = (id: number | null) => { setProvaSelecionada(id); carregarDados(id); };

  return { correcoes, provasDisponiveis, provaSelecionada, loading, refreshing, onRefresh, handleSelecionarProva };
}