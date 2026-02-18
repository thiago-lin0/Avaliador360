import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  SafeAreaView, ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function EditarProvaScreen() {
  const params = useLocalSearchParams();
  const idProva = params.id; // ID recebido da Home

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // Dados Básicos
  const [nomeProva, setNomeProva] = useState('');
  const [dataAplicacao, setDataAplicacao] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [qtdQuestoes, setQtdQuestoes] = useState('10');

  // Seleções
  const [turmas, setTurmas] = useState<any[]>([]);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<number[]>([]);
  
  // Gabarito
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [descritores, setDescritores] = useState<Record<number, string>>({});
  
  // Modais e Listas
  const [modalDescritorVisible, setModalDescritorVisible] = useState(false);
  const [questaoAlvo, setQuestaoAlvo] = useState<number | null>(null);
  const listaDescritores = Array.from({ length: 37 }, (_, i) => `D${i + 1}`);

  useEffect(() => {
    if (idProva) carregarDadosProva();
  }, [idProva]);

  async function carregarDadosProva() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Carregar Turmas Disponíveis (da escola do prof)
      const { data: prof } = await supabase.from('tb_professor').select('id_escola').eq('auth_id', user?.id).single();
      if (prof) {
        const { data: t } = await supabase.from('tb_turma').select('*').eq('id_escola', prof.id_escola);
        setTurmas(t || []);
      }

      // 2. Carregar Dados da Prova
      const { data: prova, error } = await supabase
        .from('tb_prova')
        .select('*')
        .eq('id_prova', idProva)
        .single();
      
      if (error) throw error;
      
      setNomeProva(prova.titulo);
      setDataAplicacao(new Date(prova.data_aplicacao));
      setQtdQuestoes(prova.qtd_questoes.toString());

      // 3. Carregar Vínculos (Turmas selecionadas)
      const { data: vinculos } = await supabase
        .from('tb_aplicacao_prova')
        .select('id_turma')
        .eq('id_prova', idProva);
      
      if (vinculos) {
        setTurmasSelecionadas(vinculos.map(v => v.id_turma));
      }

      // 4. Carregar Questões (Gabarito)
      const { data: questoes } = await supabase
        .from('tb_questao')
        .select('*')
        .eq('id_prova', idProva);

      if (questoes) {
        const respTemp: any = {};
        const descTemp: any = {};
        questoes.forEach(q => {
          respTemp[q.numero_questao] = q.alternativa_correta?.trim();
          descTemp[q.numero_questao] = q.descritor;
        });
        setRespostas(respTemp);
        setDescritores(descTemp);
      }

    } catch (e) {
      Alert.alert("Erro", "Falha ao carregar prova.");
      router.back();
    } finally {
      setLoading(false);
    }
  }

  const handleAtualizar = async () => {
    if (!nomeProva || turmasSelecionadas.length === 0) return Alert.alert("Atenção", "Preencha título e turmas.");
    if (Object.keys(respostas).length < parseInt(qtdQuestoes)) return Alert.alert("Atenção", "Preencha todo o gabarito.");

    setSalvando(true);
    try {
      const dataISO = dataAplicacao.toISOString().split('T')[0];

      // 1. Atualizar Tabela PROVA
      const { error: errProva } = await supabase
        .from('tb_prova')
        .update({
          titulo: nomeProva,
          data_aplicacao: dataISO,
          qtd_questoes: parseInt(qtdQuestoes)
        })
        .eq('id_prova', idProva);

      if (errProva) throw errProva;

      // 2. Atualizar Vínculos (Turmas)
      // Estratégia: Removemos todos os vínculos atuais desta prova e recriamos.
      // (Isso é seguro para vínculos simples. Se tiver notas vinculadas a tb_aplicacao_prova, seria necessário upsert,
      // mas no schema as notas estão em tb_folha_resposta -> tb_aplicacao_prova. 
      // CUIDADO: Se apagar o vínculo, pode apagar as folhas em cascata.
      // MELHORIA:  fazer um "Diff" simples para não apagar o que não mudou).
      
      // Buscar turmas atuais no banco
      const { data: atuais } = await supabase.from('tb_aplicacao_prova').select('id_turma').eq('id_prova', idProva);
      const idsAtuais = atuais?.map(a => a.id_turma) || [];

      // Turmas para ADICIONAR (novas)
      const paraAdicionar = turmasSelecionadas.filter(id => !idsAtuais.includes(id));
      // Turmas para REMOVER (desmarcadas)
      const paraRemover = idsAtuais.filter(id => !turmasSelecionadas.includes(id));

      if (paraRemover.length > 0) {
        await supabase.from('tb_aplicacao_prova')
          .delete()
          .eq('id_prova', idProva)
          .in('id_turma', paraRemover);
      }

      if (paraAdicionar.length > 0) {
        const novosLinks = paraAdicionar.map(idT => ({
          id_prova: idProva,
          id_turma: idT,
          data_aplicacao: dataISO
        }));
        await supabase.from('tb_aplicacao_prova').insert(novosLinks);
      }

      // 3. Atualizar Questões (Upsert)
      // Buscamos os IDs das questões existentes para atualizar em vez de deletar/recriar
      // (Isso mantém o histórico se a tabela de resposta_detalhe apontar para id_questao)
      
      const { data: qExistentes } = await supabase.from('tb_questao').select('id_questao, numero_questao').eq('id_prova', idProva);
      
      const upsertData = [];
      const totalQ = parseInt(qtdQuestoes);

      for (let i = 1; i <= totalQ; i++) {
        // Verifica se já existe questão com esse numero para essa prova
        const existente = qExistentes?.find(q => q.numero_questao === i);
        
        upsertData.push({
          id_questao: existente ? existente.id_questao : undefined, // Se tiver ID, atualiza. Se não, cria.
          id_prova: idProva,
          numero_questao: i,
          alternativa_correta: respostas[i],
          descritor: descritores[i] || ""
        });
      }

      const { error: errQ } = await supabase.from('tb_questao').upsert(upsertData);
      if (errQ) throw errQ;

      // Se diminuiu o número de questões, apagar as excedentes
      if (qExistentes && qExistentes.length > totalQ) {
         await supabase.from('tb_questao')
           .delete()
           .eq('id_prova', idProva)
           .gt('numero_questao', totalQ);
      }

      Alert.alert("Sucesso", "Prova atualizada!");
      router.back();

    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setSalvando(false);
    }
  };

  // --- RENDERIZAÇÃO (Similar ao Novo Gabarito) ---
  const toggleTurma = (id: number) => {
    setTurmasSelecionadas(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const renderQuestoes = () => {
    const rows = [];
    for (let i = 1; i <= (parseInt(qtdQuestoes) || 0); i++) {
      rows.push(
        <View key={i} style={styles.questaoCard}>
          <View style={styles.questaoTopo}>
            <View style={styles.badgeNum}><Text style={styles.txtNum}>{i}</Text></View>
            <TouchableOpacity style={styles.selectorDescritor} onPress={() => { setQuestaoAlvo(i); setModalDescritorVisible(true); }}>
              <Text style={[styles.txtDescritor, !descritores[i] && {color: '#AAA'}]}>{descritores[i] || "D1-D37"}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.altsContainer}>
            {['A', 'B', 'C', 'D'].map(l => (
              <TouchableOpacity key={l} style={[styles.btnAlt, respostas[i] === l && styles.btnAltActive]} onPress={() => setRespostas(p => ({...p, [i]: l}))}>
                <Text style={[styles.txtAlt, respostas[i] === l && styles.txtAltActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    return rows;
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#003399"/></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#003399" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Prova</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.formCard}>
          <Text style={styles.label}>Título da Prova</Text>
          <TextInput style={styles.input} value={nomeProva} onChangeText={setNomeProva} />
          
          <Text style={styles.label}>Data</Text>
          <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>
              {dataAplicacao.getDate().toString().padStart(2,'0')}/{ (dataAplicacao.getMonth()+1).toString().padStart(2,'0') }/{dataAplicacao.getFullYear()}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker value={dataAplicacao} mode="date" onChange={(e, d) => { if(Platform.OS==='android') setShowDatePicker(false); if(d) setDataAplicacao(d); }} textColor="black" locale="pt-BR" themeVariant="light"/>
          )}

          <Text style={[styles.label, {marginTop:15}]}>Turmas:</Text>
          <View style={styles.turmasGrid}>{turmas.map(t => (
            <TouchableOpacity key={t.id_turma} style={[styles.turmaChip, turmasSelecionadas.includes(t.id_turma) && styles.turmaChipActive]} onPress={() => toggleTurma(t.id_turma)}>
              <Text style={[styles.turmaChipText, turmasSelecionadas.includes(t.id_turma) && styles.turmaChipTextActive]}>{t.serie}º {t.turma}</Text>
            </TouchableOpacity>
          ))}</View>

          <Text style={[styles.label, {marginTop:15}]}>Nº Questões:</Text>
          <TextInput style={styles.inputSmall} keyboardType="numeric" value={qtdQuestoes} onChangeText={setQtdQuestoes} />
        </View>

        <View style={{marginBottom:20}}>{renderQuestoes()}</View>

        <TouchableOpacity style={styles.btnSave} onPress={handleAtualizar} disabled={salvando}>
          {salvando ? <ActivityIndicator color="#FFF"/> : <Text style={styles.btnSaveText}>Salvar Alterações</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal igual ao de criação */}
      <Modal visible={modalDescritorVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalScrollContent}>
            <Text style={styles.modalTitle}>Selecione o Descritor</Text>
            <FlatList data={listaDescritores} keyExtractor={(i)=>i} numColumns={4} renderItem={({item})=>(
              <TouchableOpacity style={styles.dItem} onPress={()=>{setDescritores(p=>({...p,[questaoAlvo!]:item})); setModalDescritorVisible(false)}}>
                <Text style={styles.dText}>{item}</Text>
              </TouchableOpacity>
            )}/>
            <TouchableOpacity onPress={()=>setModalDescritorVisible(false)} style={styles.btnClose}><Text style={{color:'#FFF'}}>Fechar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex:1, justifyContent:'center', alignItems:'center'},
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#003399' },
  formCard: { backgroundColor: '#F8FAFF', padding: 20, borderRadius: 25, marginBottom: 20, borderWidth: 1, borderColor: '#F0F4FF' },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EBF0FF' },
  dateSelector: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#EBF0FF' },
  dateText: { fontSize: 16, color: '#333' },
  label: { fontSize: 11, fontWeight: '900', color: '#003399', marginBottom: 5, marginTop: 5, textTransform: 'uppercase' },
  turmasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  turmaChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDE3ED' },
  turmaChipActive: { backgroundColor: '#003399', borderColor: '#003399' },
  turmaChipText: { color: '#666', fontWeight: 'bold', fontSize: 11 },
  turmaChipTextActive: { color: '#FFF' },
  inputSmall: { backgroundColor: '#FFF', width: 60, padding: 10, borderRadius: 10, textAlign: 'center', fontWeight: '800', borderWidth: 1, borderColor: '#EBF0FF' },
  questaoCard: { backgroundColor: '#F5F7FA', padding: 15, borderRadius: 20, marginBottom: 15 },
  questaoTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  badgeNum: { width: 30, height: 30, backgroundColor: '#003399', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  txtNum: { color: '#FFF', fontWeight: 'bold' },
  selectorDescritor: { flex: 1, marginLeft: 15, backgroundColor: '#FFF', padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#DDE3ED' },
  txtDescritor: { fontSize: 13, fontWeight: 'bold', color: '#003399' },
  altsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  btnAlt: { width: '22%', height: 45, borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DDE3ED' },
  btnAltActive: { backgroundColor: '#003399', borderColor: '#003399' },
  txtAlt: { fontWeight: '800', color: '#778899', fontSize: 16 },
  txtAltActive: { color: '#FFF' },
  btnSave: { backgroundColor: '#1E3A8A', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 40 },
  btnSaveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  // Modal styles (simplificados)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalScrollContent: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, maxHeight: '80%' },
  modalTitle: { textAlign:'center', fontWeight:'bold', marginBottom:20 },
  dItem: { margin: 5, padding: 15, backgroundColor: '#F0F4FF', borderRadius: 10, flex:1, alignItems:'center' },
  dText: { color: '#003399', fontWeight: 'bold' },
  btnClose: { backgroundColor: '#003399', padding: 15, borderRadius: 15, alignItems: 'center', marginTop:10 }
});