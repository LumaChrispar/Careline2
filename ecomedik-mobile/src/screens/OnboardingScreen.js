import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, fontSize } from '../theme/theme';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = '@ecomedik_onboarding_complete';

const slides = [
  {
    id: '1',
    icon: '🏥',
    title: 'Your Health,\nDigitised',
    subtitle:
      'Access your complete medical history, prescriptions, and health records all in one secure place.',
    accentWord: 'Digitised',
  },
  {
    id: '2',
    icon: '🔬',
    title: 'Instant Lab\nResults',
    subtitle:
      'Get notified the moment your lab results are ready. No more waiting your doctor is already informed.',
    accentWord: 'Instant',
  },
  {
    id: '3',
    icon: '🛡️',
    title: 'Community\nProtection',
    subtitle:
      'Automated outbreak detection keeps your community safe. Early warning saves lives.',
    accentWord: 'Protection',
  },
];

export default function OnboardingScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  }, [currentIndex]);

  const handleGetStarted = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    navigation.replace('Login');
  }, [navigation]);

  const renderSlide = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const iconScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp',
    });

    const titleTranslate = scrollX.interpolate({
      inputRange,
      outputRange: [60, 0, -60],
      extrapolate: 'clamp',
    });

    const subtitleOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slide, { width }]}>
        {/* Decorative circles */}
        <View
          style={[
            styles.decorCircle,
            styles.decorCircle1,
            { backgroundColor: colors.primary + '12' },
          ]}
        />
        <View
          style={[
            styles.decorCircle,
            styles.decorCircle2,
            { backgroundColor: colors.accent + '10' },
          ]}
        />

        {/* Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: iconScale }],
              backgroundColor: isDark ? colors.surfaceLight : colors.surfaceLight,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={styles.iconEmoji}>{item.icon}</Text>
        </Animated.View>

        {/* Title */}
        <Animated.View style={{ transform: [{ translateX: titleTranslate }] }}>
          <Text style={[styles.title, { color: colors.text }]}>
            {item.title}
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={{ opacity: subtitleOpacity }}>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {item.subtitle}
          </Text>
        </Animated.View>
      </View>
    );
  };

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <LinearGradient
      colors={colors.gradientOnboarding}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Skip button */}
      {!isLastSlide && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleGetStarted}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: colors.textMuted }]}>
            Skip
          </Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
        scrollEventThrottle={16}
      />

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {/* Dot indicators */}
        <View style={styles.dotContainer}>
          {slides.map((_, i) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [8, 28, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={isLastSlide ? handleGetStarted : handleNext}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={colors.gradientHero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {isLastSlide ? 'Get Started' : 'Next'}
            </Text>
            <Text style={styles.buttonArrow}>
              {isLastSlide ? '→' : '›'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Page label */}
        <Text style={[styles.pageLabel, { color: colors.textMuted }]}>
          {currentIndex + 1} of {slides.length}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 140,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  decorCircle1: {
    width: 300,
    height: 300,
    top: height * 0.08,
    right: -80,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    bottom: height * 0.25,
    left: -60,
  },
  iconContainer: {
    width: 130,
    height: 130,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  iconEmoji: {
    fontSize: 56,
  },
  title: {
    fontSize: fontSize.hero,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -1,
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
    maxWidth: 320,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 50,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonWrapper: {
    width: '100%',
    marginBottom: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: borderRadius.lg,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  pageLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
