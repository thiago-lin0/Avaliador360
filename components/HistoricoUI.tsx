import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Correcao, ProvaFiltro } from '../hooks/useHistoricoCorrecoes';

// --- CHIP DE FILTRO ---
interface FiltroProvasProps {
  provas: ProvaFiltro[];
  selecionada: number | null;
  onSelect: (id: number | null) => void;
}

export function FiltroProvas({ provas, selecionada, onSelect }: FiltroProvasProps) {
  return (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        <TouchableOpacity 
          style={[styles.chip, selecionada === null && styles.chipActive]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.chipText, selecionada === null && styles.chipTextActive]}>Todas</Text>
        </TouchableOpacity>
        
        {provas.map((p) => (
          <TouchableOpacity 
            key={p.id_prova} 
            style={[styles.chip, selecionada === p.id_prova && styles.chipActive]}
            onPress={() => onSelect(p.id_prova)}
          >
            <Text style={[styles.chipText, selecionada === p.id_prova && styles.chipTextActive]}>
              {p.titulo}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// --- CARD DO ALUNO ---
interface CardCorrecaoProps {
  item: Correcao;
}

export function CardCorrecao({ item }: CardCorrecaoProps) {
  const nome = item.tb_aluno?.nome_completo || "Aluno";
  const nota = item.nota_final || 0;
  const dataObj = item.data_correcao ? new Date(item.data_correcao) : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{nome.charAt(0)}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.nome} numberOfLines={1}>{nome}</Text>
          <View style={styles.row}>
            <Ionicons name="document-text-outline" size={12} color="#94A3B8" />
            <Text style={styles.subText}> {item.tb_prova?.titulo} </Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.subText}>{dataObj?.toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: nota >= 6 ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={[styles.badgeTxt, { color: nota >= 6 ? '#166534' : '#991B1B' }]}>
            {nota.toFixed(1)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// --- LISTA VAZIA ---
export function ListaVazia() {
  return (
    <View style={styles.empty}>
      <Ionicons name="school-outline" size={60} color="#CBD5E1" />
      <Text style={styles.emptyTxt}>Nenhuma correção encontrada para esta unidade.</Text>
    </View>
  );
}

// Estilos dos componentes visuais
const styles = StyleSheet.create({
  filterContainer: { backgroundColor: '#FFF', paddingVertical: 12 },
  filterScroll: { paddingHorizontal: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#2B428C', borderColor: '#2B428C' },
  chipText: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  chipTextActive: { color: '#FFF' },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 20, fontWeight: 'bold', color: '#4338CA' },
  content: { flex: 1, marginLeft: 14 },
  nome: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  subText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  separator: { marginHorizontal: 5, color: '#CBD5E1', fontSize: 10 },
  badge: { minWidth: 50, padding: 8, borderRadius: 12, alignItems: 'center' },
  badgeTxt: { fontSize: 17, fontWeight: '900' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyTxt: { marginTop: 15, color: '#94A3B8', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 }
});