import { Ionicons } from '@expo/vector-icons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

// --- CONFIGURAÇÃO DA API ---
const API_URL = "process.env.EXPO_PUBLIC_API_URL"; 

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MASK_WIDTH = SCREEN_WIDTH * 0.85; 
const MASK_HEIGHT = MASK_WIDTH * (1754 / 1240); 
const MASK_X = (SCREEN_WIDTH - MASK_WIDTH) / 2;
const MASK_Y = (SCREEN_HEIGHT - MASK_HEIGHT) / 2;

export default function EscanearGabaritoScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [loading, setLoading] = useState(false);
    const [scannedResult, setScannedResult] = useState<any>(null);
    const [isDetected, setIsDetected] = useState(false); 
    const [flash, setFlash] = useState<boolean>(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    
    const cameraRef = useRef<any>(null);
    const timeoutRef = useRef<any>(null);

    const onCameraReady = () => {
        setIsCameraReady(true);
        setTimeout(() => setFlash(true), 800); // Delay para estabilizar o flash
    };

   
    if (!permission?.granted) {
        return (
            <View style={styles.containerCenter}>
                <TouchableOpacity style={styles.btnPermissao} onPress={requestPermission}>
                    <Text style={styles.btnText}>ATIVAR CÂMERA</Text>
                </TouchableOpacity>
            </View>
        );
    }

    function onBarcodeScanned(result: BarcodeScanningResult) {
        if (loading || scannedResult) return;
        if (result.data) {
            if (!isDetected) {
                Vibration.vibrate(80); 
                setIsDetected(true);
            }
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setIsDetected(false), 2000);
        }
    }

    async function handleCapturar() {
        if (!cameraRef.current || loading || !isDetected) return;
        setLoading(true);

        try {
            const foto = await cameraRef.current.takePictureAsync({ 
                quality: 1.0, 
                skipProcessing: false 
            });


            const fotoW = foto.width;
            const fotoH = foto.height;
            
            const scaleX = foto.width / SCREEN_WIDTH;
            const scaleY = foto.height / SCREEN_HEIGHT;

            const MARGEM = 150; 

            const originX = Math.max(0, (MASK_X * scaleX) - MARGEM);
            const originY = Math.max(0, (MASK_Y * scaleY) - MARGEM);

            const cropWidth = Math.min(fotoW - originX, (MASK_WIDTH * scaleX) + (MARGEM * 2));
            const cropHeight = Math.min(fotoH - originY, (MASK_HEIGHT * scaleY) + (MARGEM * 2));

            const cropRegion = {
              originX: originX,
              originY: originY,
              width: cropWidth,
              height: cropHeight,
            };

            console.log("Fazendo crop em:", cropRegion);

            const manipulada = await ImageManipulator.manipulateAsync(
                foto.uri,
                [{ crop: cropRegion }, { resize: { height: 1600 } }], 
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            const formData = new FormData();
            formData.append('file', {
                uri: manipulada.uri,
                name: 'scan_gabarito.jpg',
                type: 'image/jpeg',
            } as any);

            const response = await fetch(`${API_URL}/corrigir-prova`, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' },
            });

            const resData = await response.json();

            if (response.ok && resData.status === "sucesso") {
                setScannedResult(resData);
            } else {
                setIsDetected(false); 
                Alert.alert("Erro", resData.msg || "Falha no processamento.");
            }
        } catch (error: any) {
            Alert.alert("Erro de Conexão", error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleConfirmar() {
        if (!scannedResult || !scannedResult.id_folha) {
            Alert.alert("Erro", "Dados da correção incompletos.");
            return;
        }
        
        setLoading(true);
        try {
            // CORREÇÃO: Alterado de 'nota' para 'nota_final' conforme seu banco
            const { error } = await supabase.from('tb_folha_resposta')
                .update({ 
                    nota_final: scannedResult.resultado.acertos, 
                    status: 'CORRIGIDO',
                    data_correcao: new Date().toISOString()
                })
                .eq('id_folha', scannedResult.id_folha);
            
            if (error) throw error;

            setScannedResult(null);
            setIsDetected(false);
            Alert.alert("Sucesso", "Gabarito salvo com sucesso!");
            
        } catch (e: any) {
            Alert.alert("Falha ao Salvar", e.message);
        } finally {
            setLoading(false);
        }
    }

    

    return (
        <View style={styles.container}>
            <CameraView 
                style={styles.camera} 
                ref={cameraRef}
                zoom={0.05}
                enableTorch={isCameraReady && flash} onCameraReady={onCameraReady}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={onBarcodeScanned}
                autofocus="on"
            >
                <View style={styles.header}>
                    <TouchableOpacity style={styles.btnClose} onPress={() => router.back()}>
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.tag}>
                        <Text style={styles.tagTxt}>CORRETOR PRO</Text>
                    </View>
                    <TouchableOpacity style={styles.btnFlash} onPress={() => setFlash(!flash)}>
                        <Ionicons name={flash ? "flashlight" : "flashlight-outline"} size={24} color={flash ? "#FFD700" : "#FFF"} />
                    </TouchableOpacity>
                </View>

                <View style={styles.viewfinder}>
                    <View style={[styles.guideFrame, isDetected && styles.frameActive]}>
                        <View style={[styles.corner, styles.tl, isDetected && styles.cornerActive]} />
                        <View style={[styles.corner, styles.tr, isDetected && styles.cornerActive]} />
                        <View style={[styles.corner, styles.bl, isDetected && styles.cornerActive]} />
                        <View style={[styles.corner, styles.br, isDetected && styles.cornerActive]} />
                        {loading && <ActivityIndicator size="large" color="#4ADE80" />}
                    </View>
                </View>

                <View style={styles.footer}>
                    {!scannedResult ? (
                        <TouchableOpacity 
                            style={[styles.btnCapture, !isDetected && styles.btnDisabled]} 
                            onPress={handleCapturar}
                            disabled={!isDetected || loading}
                        >
                            <View style={styles.btnCaptureInner} />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.cardResult}>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardName}>{scannedResult.aluno}</Text>
                                <Text style={styles.cardScore}>Acertos: {scannedResult.resultado.acertos}/{scannedResult.resultado.total}</Text>
                            </View>
                            <TouchableOpacity style={styles.btnSave} onPress={handleConfirmar}>
                                <Text style={styles.btnSaveTxt}>SALVAR NOTA</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    containerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' },
    btnPermissao: { backgroundColor: '#4ADE80', padding: 15, borderRadius: 8 },
    btnText: { fontWeight: 'bold' },
    header: { position: 'absolute', top: 50, width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center' },
    btnClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    btnFlash: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    tag: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 10 },
    tagTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
    viewfinder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    guideFrame: { width: SCREEN_WIDTH * 0.85, aspectRatio: 1240 / 1754, justifyContent: 'center', alignItems: 'center' },
    frameActive: { backgroundColor: 'rgba(74, 222, 128, 0.1)' },
    corner: { position: 'absolute', width: 30, height: 30, borderColor: 'rgba(255,255,255,0.3)', borderWidth: 4 },
    cornerActive: { borderColor: '#4ADE80', borderWidth: 6 },
    tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    footer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
    btnCapture: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFF' },
    btnDisabled: { opacity: 0.3 },
    btnCaptureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF' },
    cardResult: { width: '90%', backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
    cardInfo: { marginBottom: 15 },
    cardName: { fontSize: 18, fontWeight: 'bold', color: '#111' },
    cardScore: { fontSize: 16, color: '#15803D', fontWeight: 'bold' },
    btnSave: { backgroundColor: '#2B428C', padding: 15, borderRadius: 12, alignItems: 'center' },
    btnSaveTxt: { color: '#FFF', fontWeight: 'bold' }
});