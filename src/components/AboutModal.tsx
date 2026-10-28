import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { openConsentSettings } from '../lib/analytics';
import { AppLanguage, copy } from '../lib/copy';
import { colors, fonts, radius, shadows, type } from '../theme';
import { BrandMark } from './BrandMark';
import { ExternalLink, X } from './icons';
import { Button, IconButton } from './ui';

const SOURCES = [
  { label: 'prix-carburants.gouv.fr', url: 'https://www.prix-carburants.gouv.fr/' },
  {
    label: 'data.economie.gouv.fr, prix des carburants (flux instantané v2)',
    url: 'https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/',
  },
  {
    label: 'Noms et enseignes : contributeurs OpenStreetMap (ODbL), via Osmose',
    url: 'https://www.openstreetmap.org/copyright',
  },
  { label: 'geo.api.gouv.fr, communes', url: 'https://geo.api.gouv.fr/decoupage-administratif/communes' },
  { label: 'Fond de carte : OpenFreeMap, OpenMapTiles, OpenStreetMap', url: 'https://openfreemap.org' },
];

export function AboutModal({ language, onClose, visible }: { language: AppLanguage; onClose: () => void; visible: boolean }) {
  const t = copy[language];

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel={t.about.close} onPress={onClose} style={styles.backdrop}>
        <Pressable onPress={() => undefined} style={[styles.card, shadows.floating]}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <BrandMark size={36} />
                <Text accessibilityRole="header" style={styles.title}>
                  {t.about.title}
                </Text>
              </View>
              <IconButton icon={X} label={t.about.close} onPress={onClose} size={38} />
            </View>

            {t.about.body.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}

            <Text style={styles.subtitle}>{t.about.sources}</Text>
            {SOURCES.map((source) => (
              <Pressable accessibilityRole="link" key={source.url} onPress={() => Linking.openURL(source.url)} style={styles.source}>
                <ExternalLink color={colors.blue} size={14} />
                <Text style={styles.sourceText}>{source.label}</Text>
              </Pressable>
            ))}

            <View style={styles.actions}>
              <Button
                label={t.app.cookies}
                onPress={() => {
                  onClose();
                  openConsentSettings();
                }}
                variant="secondary"
              />
              <Button label={t.about.close} onPress={onClose} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.sheet,
    maxHeight: '90%',
    maxWidth: 580,
    width: '100%',
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paragraph: {
    color: colors.black,
    fontFamily: fonts.regular,
    fontSize: type.body,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 520,
  },
  source: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 5,
  },
  sourceText: {
    color: colors.blue,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: type.small,
    textDecorationLine: 'underline',
  },
  subtitle: {
    color: colors.black,
    fontFamily: fonts.semibold,
    fontSize: type.heading,
    marginBottom: 6,
    marginTop: 24,
  },
  title: {
    color: colors.black,
    fontFamily: fonts.semibold,
    fontSize: type.title,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
});
