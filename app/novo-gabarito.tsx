import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const API_URL = "process.env.EXPO_PUBLIC_API_URL"; 

export default function GestaoProvasScreen() {
  const [modo, setModo] = useState<'lista' | 'criar'>('lista');
  const [loadingLista, setLoadingLista] = useState(true);
  const [loadingSalvar, setLoadingSalvar] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [provas, setProvas] = useState<any[]>([]);
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<any[]>([]);
  const [escolaId, setEscolaId] = useState<number | null>(null);

  // Estados do Formulário
  const [idProvaEditando, setIdProvaEditando] = useState<number | null>(null);
  const [nomeProva, setNomeProva] = useState('');
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<number[]>([]);
  const [qtdQuestoes, setQtdQuestoes] = useState('10'); 
  
  // Estados do Gabarito
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [descritores, setDescritores] = useState<Record<number, string>>({});
  
  // Modais
  const [modalDownloadVisible, setModalDownloadVisible] = useState(false);
  const [modalDescritorVisible, setModalDescritorVisible] = useState(false);
  const [provaSelecionadaParaDownload, setProvaSelecionadaParaDownload] = useState<any>(null);
  const [questaoAlvo, setQuestaoAlvo] = useState<number | null>(null);

  const alternativas = ['A', 'B', 'C', 'D'];
  const listaDescritores = Array.from({ length: 37 }, (_, i) => `D${i + 1}`);

  useFocusEffect(useCallback(() => { carregarProvas(); }, []));
  useEffect(() => { carregarDadosIniciais(); }, []);

  async function carregarDadosIniciais() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase.from('tb_professor').select('id_escola').eq('auth_id', user.id).single();
      if (prof) {
        setEscolaId(prof.id_escola);
        const { data: turmas } = await supabase.from('tb_turma').select('*').eq('id_escola', prof.id_escola);
        setTurmasDisponiveis(turmas || []);
      }
    } catch (e) { console.error(e); }
  }

  async function carregarProvas() {
    setLoadingLista(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('tb_prova')
        .select(`*, tb_aplicacao_prova (id_turma, tb_turma (serie, turma, turno))`)
        .eq('id_professor', user?.id)
        .order('id_prova', { ascending: false });
      if (error) throw error;
      setProvas(data || []);
    } catch (e) { console.error(e); } finally { setLoadingLista(false); setRefreshing(false); }
  }

  async function handleBaixarPDF(idTurma: number, nomeTurma: string) {
    setLoadingDownload(true); 
    setModalDownloadVisible(false);
    try {
      const downloadUrl = `${API_URL}/gerar-pdf-turma/${idTurma}`;
      const response = await fetch(downloadUrl); // Pre-fetch para segurar o loading
      if (!response.ok) throw new Error("Erro ao gerar PDF.");
      await WebBrowser.openBrowserAsync(downloadUrl);
    } catch (error: any) {
      Alert.alert("Erro", "Verifique se a API no PC está rodando.");
    } finally { setLoadingDownload(false); }
  }

  async function handlePrepararEdicao(prova: any) {
    setLoadingSalvar(true);
    try {
      setIdProvaEditando(prova.id_prova);
      setNomeProva(prova.titulo);
      setQtdQuestoes(prova.qtd_questoes.toString());
      setTurmasSelecionadas(prova.tb_aplicacao_prova.map((v: any) => v.id_turma));

      const { data: questoes } = await supabase.from('tb_questao').select('*').eq('id_prova', prova.id_prova);
      if (questoes) {
        const respMap: Record<number, string> = {};
        const descMap: Record<number, string> = {};
        questoes.forEach(q => {
          respMap[q.numero_questao] = q.alternativa_correta;
          descMap[q.numero_questao] = q.descritor || "";
        });
        setRespostas(respMap);
        setDescritores(descMap);
      }
      setModo('criar');
    } catch (e) { console.error(e); } finally { setLoadingSalvar(false); }
  }

  async function handleSalvar() {
    if (!nomeProva || turmasSelecionadas.length === 0) return Alert.alert("Atenção", "Preencha título e turmas.");
    const total = parseInt(qtdQuestoes);
    
    setLoadingSalvar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let id_prova_final = idProvaEditando;

      if (idProvaEditando) {
        await supabase.from('tb_prova').update({ titulo: nomeProva, qtd_questoes: total }).eq('id_prova', idProvaEditando);
        await supabase.from('tb_aplicacao_prova').delete().eq('id_prova', idProvaEditando);
        await supabase.from('tb_questao').delete().eq('id_prova', idProvaEditando);
      } else {
        const { data: prova, error: errP } = await supabase.from('tb_prova').insert([{
          titulo: nomeProva, id_professor: user?.id, id_escola: escolaId, qtd_questoes: total
        }]).select().single();
        if (errP) throw errP;
        id_prova_final = prova.id_prova;
      }

      // Vínculos
      const vinculos = turmasSelecionadas.map(idT => ({ id_prova: id_prova_final, id_turma: idT }));
      await supabase.from('tb_aplicacao_prova').insert(vinculos);

      // Questões (Gabarito)
      const questoesParaSalvar = Object.keys(respostas).map(num => ({
        id_prova: id_prova_final,
        numero_questao: parseInt(num),
        alternativa_correta: respostas[parseInt(num)],
        descritor: descritores[parseInt(num)] || ""
      }));
      await supabase.from('tb_questao').insert(questoesParaSalvar);

      // Gerar folhas se for novo
      if (!idProvaEditando) {
        const { data: alunos } = await supabase.from('tb_aluno').select('id_aluno').in('id_turma', turmasSelecionadas);
        if (alunos) {
          const folhas = alunos.map(aluno => ({
            id_prova: id_prova_final, id_aluno: aluno.id_aluno, status: 'PENDENTE',
            codigo_qrcode: `P${id_prova_final}A${aluno.id_aluno}`
          }));
          await supabase.from('tb_folha_resposta').insert(folhas);
        }
      }

      Alert.alert("Sucesso!", "Dados salvos com sucesso.");
      resetForm(); carregarProvas();
    } catch (e: any) { Alert.alert("Erro", e.message); } finally { setLoadingSalvar(false); }
  }

  const resetForm = () => { 
    setNomeProva(''); setTurmasSelecionadas([]); setIdProvaEditando(null); 
    setRespostas({}); setDescritores({}); setModo('lista'); 
  };

  const selecionarDescritor = (desc: string) => {
    if (questaoAlvo !== null) setDescritores(prev => ({ ...prev, [questaoAlvo]: desc }));
    setModalDescritorVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {loadingDownload && (
        <View style={styles.overlayLoading}>
          <ActivityIndicator size="large" color="#003399" />
          <Text style={styles.loadingText}>O Servidor está gerando o PDF...</Text>
        </View>
      )}

      {modo === 'lista' ? (
        <>
          <View style={styles.headerLista}>
             <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={26} color="#003399"/></TouchableOpacity>
             <Text style={styles.headerTitle}>Minhas Provas</Text>
          </View>
          <FlatList 
            data={provas} 
            keyExtractor={i => i.id_prova.toString()} 
            renderItem={({item}) => (
              <View style={styles.cardLista}>
                <View style={styles.infoBox}>
                  <Text style={styles.cardTitle}>{item.titulo}</Text>
                  <Text style={styles.cardTurma}>{item.tb_aplicacao_prova?.length || 0} turmas • {item.qtd_questoes} questões</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => { setProvaSelecionadaParaDownload(item); setModalDownloadVisible(true); }}>
                    <Ionicons name="cloud-download-outline" size={24} color="#003399" style={{ marginRight: 12 }} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handlePrepararEdicao(item)}>
                    <Ionicons name="pencil-outline" size={22} color="#F59E0B" style={{ marginRight: 12 }} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { 
                    Alert.alert("Excluir", "Apagar prova?", [
                      { text: "Não" },
                      { text: "Sim", onPress: async () => { await supabase.from('tb_prova').delete().eq('id_prova', item.id_prova); carregarProvas(); }}
                    ]);
                  }}>
                    <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            )} 
            contentContainerStyle={{ padding: 20 }} 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={carregarProvas}/>}
          />
          <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModo('criar'); }}><Ionicons name="add" size={32} color="#FFF" /></TouchableOpacity>
        </>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={styles.formHeader}>
             <TouchableOpacity onPress={resetForm}><Ionicons name="close" size={28} color="#333"/></TouchableOpacity>
             <Text style={styles.titleForm}>{idProvaEditando ? 'Editar Gabarito' : 'Novo Gabarito'}</Text>
          </View>
          
          <Text style={styles.label}>Título da Prova</Text>
          <TextInput style={styles.input} value={nomeProva} onChangeText={setNomeProva} placeholder="Ex: Avaliação Bimestral" />
          
          <Text style={styles.label}>Vincular Turmas</Text>
          <View style={styles.turmasGrid}>
            {turmasDisponiveis.map(t => (
              <TouchableOpacity key={t.id_turma} style={[styles.chip, turmasSelecionadas.includes(t.id_turma) && styles.chipActive]} onPress={() => setTurmasSelecionadas(p => p.includes(t.id_turma) ? p.filter(x => x !== t.id_turma) : [...p, t.id_turma])}>
                <Text style={[styles.chipText, turmasSelecionadas.includes(t.id_turma) && {color:'#FFF'}]}>{t.serie}º {t.turma}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.gabaritoHeader}>
            <Text style={styles.label}>Gabarito Oficial</Text>
            <View style={styles.qtdBox}>
              <Text style={{fontSize: 12, color: '#666'}}>Questões:</Text>
              <TextInput style={styles.inputQtd} keyboardType="numeric" value={qtdQuestoes} onChangeText={setQtdQuestoes} maxLength={2} />
            </View>
          </View>

          <View style={styles.gabaritoCard}>
            {Array.from({ length: parseInt(qtdQuestoes) || 0 }).map((_, index) => {
              const i = index + 1;
              return (
                <View key={i} style={styles.questaoRow}>
                  <Text style={styles.questaoNumero}>{i < 10 ? `0${i}` : i}</Text>
                  <View style={styles.alternativasContainer}>
                    {alternativas.map(alt => (
                      <TouchableOpacity 
                        key={alt} 
                        style={[styles.altBtn, respostas[i] === alt && styles.altBtnActive]}
                        onPress={() => setRespostas(prev => ({ ...prev, [i]: alt }))}
                      >
                        <Text style={[styles.altText, respostas[i] === alt && { color: '#FFF' }]}>{alt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.btnAbreDescritor} onPress={() => { setQuestaoAlvo(i); setModalDescritorVisible(true); }}>
                    <Text style={styles.textDescritor}>{descritores[i] || 'Desc.'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
          
          <TouchableOpacity style={styles.btnSave} onPress={handleSalvar} disabled={loadingSalvar}>
             {loadingSalvar ? <ActivityIndicator color="#FFF"/> : <Text style={styles.btnSaveText}>{idProvaEditando ? 'SALVAR ALTERAÇÕES' : 'CRIAR PROVA E GABARITO'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* MODAL DESCRITORES - FECHA AO CLICAR FORA */}
      <Modal visible={modalDescritorVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalDescritorVisible(false)}>
          <View style={styles.modalDescContent}>
            <View style={styles.modalHeaderIndicator} />
            <Text style={styles.modalTitle}>Selecionar Descritor</Text>
            <ScrollView contentContainerStyle={styles.descritoresGrid}>
              {listaDescritores.map(d => (
                <TouchableOpacity key={d} style={styles.descItem} onPress={() => selecionarDescritor(d)}>
                  <Text style={styles.descItemText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL DOWNLOAD */}
      <Modal visible={modalDownloadVisible} transparent animationType="fade">
        <View style={styles.modalBody}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gerar Gabaritos</Text>
            {provaSelecionadaParaDownload?.tb_aplicacao_prova.map((v: any) => (
              <TouchableOpacity key={v.id_turma} style={styles.btnDownloadOption} onPress={() => handleBaixarPDF(v.id_turma, `${v.tb_turma.serie}${v.tb_turma.turma}`)}>
                <Text style={styles.btnDownloadText}>{v.tb_turma.serie}º {v.tb_turma.turma}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.btnClose} onPress={() => setModalDownloadVisible(false)}><Text style={{color:'#FFF'}}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerLista: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#003399', marginLeft: 15 },
  cardLista: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  infoBox: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  cardTurma: { fontSize: 12, color: '#64748B', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  fab: { position: 'absolute', bottom: 30, right: 25, backgroundColor: '#003399', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  overlayLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  loadingText: { marginTop: 10, color: '#003399', fontWeight: 'bold' },
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  titleForm: { fontSize: 18, fontWeight: 'bold', marginLeft: 15, color: '#1E293B' },
  label: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 5 },
  input: { backgroundColor: '#FFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', marginBottom: 10 },
  turmasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, backgroundColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#003399' },
  chipText: { fontSize: 11, color: '#475569' },
  gabaritoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  qtdBox: { flexDirection: 'row', alignItems: 'center' },
  inputQtd: { backgroundColor: '#FFF', width: 45, padding: 5, borderRadius: 6, borderWidth: 1, borderColor: '#DDD', marginLeft: 10, textAlign: 'center' },
  gabaritoCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 10 },
  questaoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  questaoNumero: { width: 30, fontSize: 14, fontWeight: 'bold', color: '#003399' },
  alternativasContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 10 },
  altBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  altBtnActive: { backgroundColor: '#003399', borderColor: '#003399' },
  altText: { fontSize: 13, fontWeight: 'bold', color: '#64748B' },
  btnAbreDescritor: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', minWidth: 60, alignItems: 'center' },
  textDescritor: { fontSize: 12, fontWeight: 'bold', color: '#003399' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalDescContent: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: '75%' },
  modalHeaderIndicator: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  descritoresGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  descItem: { width: '23%', backgroundColor: '#F8FAFC', paddingVertical: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  descItemText: { fontWeight: 'bold', color: '#1E293B', fontSize: 14 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  btnSave: { backgroundColor: '#003399', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  btnSaveText: { color: '#FFF', fontWeight: 'bold' },
  modalBody: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  btnDownloadOption: { backgroundColor: '#F1F5F9', padding: 15, borderRadius: 12, marginBottom: 8 },
  btnDownloadText: { color: '#003399', fontWeight: 'bold', textAlign: 'center' },
  btnClose: { backgroundColor: '#666', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 }
});