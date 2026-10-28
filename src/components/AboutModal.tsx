import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { openConsentSettings } from '../lib/analytics';
import { AppLanguage, copy } from '../lib/copy';
import { colors, fonts, radius, shadows } from '../theme';
import { Wordmark } from './BrandMark';
import { ExternalLink, X } from './icons';
import { Button, IconButton } from './ui';

const SOURCES = [
  { label: 'prix-carburants.gouv.fr', url: 'https://www.prix-carburants.gouv.fr/' },
  {
    label: 'data.economie.gouv.fr — Prix des carburants (flux instantané v2)',
    url: 'https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/',
  },
  { label: 'geo.api.gouv.fr — Communes', url: 'https://geo.api.gouv.fr/decoupage-administratif/communes' },
  { label: 'Fond de carte : Plan IGN — Géoplateforme', url: 'https://geoservices.ign.fr/services-geoplateforme-diffusion' },
];

export function AboutModal({ language, onClose, visible }: { language: AppLanguage; onClose: () => void; visible: boolean }) {
  const t = copy[language];

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel={t.about.close} onPress={onClose} style={styles.backdrop}>
        <Pressable onPress={() => undefined} style={[styles.card, shadows.floating]}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Wordmark size={20} />
              <IconButton icon={X} label={t.about.close} onPress={onClose} tone="ghost" />
            </View>

            <Text accessibilityRole="header" style={styles.title}>
              {t.about.title}
            </Text>
            {t.about.body.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}

            <Text style={styles.subtitle}>{t.about.sources}</Text>
            {SOURCES.map((source) => (
              <Pressable
                accessibilityRole="link"
                key={source.url}
                onPress={() => Linking.openURL(source.url)}
                style={styles.source}
              >
                <ExternalLink color={colors.brand} size={14} />
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
              <Button label={t.about.close} onPress={onClose} variant="dark" />
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
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    maxHeight: '90%',
    maxWidth: 560,
    width: '100%',
  },
  content: {
    padding: 22,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paragraph: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  source: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 5,
  },
  sourceText: {
    color: colors.brandStrong,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 13.5,
  },
  subtitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 14,
    marginBottom: 6,
    marginTop: 20,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.4,
    marginTop: 20,
  },
});
