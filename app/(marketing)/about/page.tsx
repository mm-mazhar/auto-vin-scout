// app/(marketing)/about/page.tsx

'use client';

import { BorderBeam } from '@/app/(marketing)/_components/ui/border-beam';
import { CardHoverEffect } from '@/app/(marketing)/_components/ui/pulse-card';
import {
  MARKETING_ALIGNED_CONTAINER_WIDTH,
  MARKETING_ALIGNED_CONTENT_WIDTH,
  MARKETING_CONTENT_SECTION_BOTTOM_SPACING,
  MARKETING_CONTENT_SECTION_TOP_SPACING,
  PageSection,
} from '@/components/page-section';
import { Badge } from '@/components/ui/badge';
// Spotlight removed (background animation disabled)
import { motion, useInView } from 'framer-motion';
import {
  Globe,
  Heart,
  Lightbulb,
  Rocket,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { useRef } from 'react';

interface AboutUsProps {
  title?: string;
  subtitle?: string;
  mission?: string;
  vision?: string;
  values?: Array<{
    title: string;
    description: string;
    icon: keyof typeof iconComponents;
  }>;
  className?: string;
}

const iconComponents = {
  Users: Users,
  Heart: Heart,
  Lightbulb: Lightbulb,
  Globe: Globe,
  Sparkles: Sparkles,
  Rocket: Rocket,
  Target: Target,
};

const defaultValues: AboutUsProps['values'] = [
  {
    title: 'Innovation',
    description:
      'We constantly push boundaries and explore new possibilities to create cutting-edge solutions.',
    icon: 'Lightbulb',
  },
  {
    title: 'Collaboration',
    description:
      'We believe in the power of teamwork and diverse perspectives to achieve extraordinary results.',
    icon: 'Users',
  },
  {
    title: 'Excellence',
    description:
      'We strive for perfection in everything we do, consistently delivering high-quality work.',
    icon: 'Sparkles',
  },
  {
    title: 'Impact',
    description:
      "We measure our success by the positive difference we make in people's lives and businesses.",
    icon: 'Globe',
  },
];

export default function AboutUs1() {
  const aboutData = {
    title: 'About Us',
    subtitle:
      'Building the future of web development with beautiful, reusable components.',
    mission:
      'Our mission is to democratize web development by providing high-quality, customizable components that help developers build stunning websites quickly and efficiently.',
    vision:
      'We envision a world where creating beautiful websites is accessible to everyone, regardless of their design or development experience.',
    values: defaultValues,
    className: 'relative overflow-hidden py-20',
  };

  const missionRef = useRef(null);
  const valuesRef = useRef(null);

  const missionInView = useInView(missionRef, { once: true, amount: 0.3 });
  const valuesInView = useInView(valuesRef, { once: true, amount: 0.3 });

  return (
    <PageSection
      className={`relative overflow-hidden ${MARKETING_CONTENT_SECTION_TOP_SPACING} ${MARKETING_CONTENT_SECTION_BOTTOM_SPACING}`}
      containerClassName={MARKETING_ALIGNED_CONTAINER_WIDTH}
    >

      <div className="relative z-10 flex flex-col items-center space-y-6 px-4">
        <Badge
                  variant="outline"
                  className="border-primary mb-4 px-3 py-1 text-xs font-medium tracking-wider uppercase"
                >
                  About
                </Badge>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mx-auto mb-6 max-w-2xl text-center"
        >
          <h1 className="from-foreground/80 via-foreground to-foreground/80 mt-3 bg-gradient-to-r bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
            {aboutData.title}
          </h1>
          <p className="text-muted-foreground mt-4 text-xl">
            {aboutData.subtitle}
          </p>
        </motion.div>

        {/* Mission & Vision Section */}
        <div ref={missionRef} className={`relative mb-8 ${MARKETING_ALIGNED_CONTENT_WIDTH}`}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={
              missionInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }
            }
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="relative z-10 grid gap-12 md:grid-cols-2"
          >
            <motion.div
              whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
              className="group border-border/40 relative block overflow-hidden rounded-2xl border bg-gradient-to-br p-10 backdrop-blur-3xl"
            >
              <BorderBeam
                duration={8}
                size={300}
                className="via-primary/25 from-transparent to-transparent"
              />

              <div className="from-primary/12 to-primary/[0.03] mb-6 inline-flex aspect-square h-16 w-16 flex-1 items-center justify-center rounded-2xl bg-gradient-to-br backdrop-blur-sm">
                <Rocket className="text-primary/85 h-8 w-8" />
              </div>

              <div className="space-y-4">
                <h2 className="from-primary/75 to-primary/55 mb-4 bg-gradient-to-r bg-clip-text text-3xl font-bold text-transparent">
                  Our Mission
                </h2>

                <p className="text-muted-foreground text-lg leading-relaxed">
                  {aboutData.mission}
                </p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
              className="group border-border/40 relative block overflow-hidden rounded-2xl border bg-gradient-to-br p-10 backdrop-blur-3xl"
            >
              <BorderBeam
                duration={8}
                size={300}
                className="from-transparent via-primary/25 to-transparent"
                reverse
              />
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/12 to-primary/[0.03] backdrop-blur-sm">
                <Target className="h-8 w-8 text-primary/85" />
              </div>

              <h2 className="mb-4 bg-gradient-to-r from-primary/75 to-primary/55 bg-clip-text text-3xl font-bold text-transparent">
                Our Vision
              </h2>

              <p className="text-muted-foreground text-lg leading-relaxed">
                {aboutData.vision}
              </p>
            </motion.div>
          </motion.div>
        </div>

        <div ref={valuesRef} className={MARKETING_ALIGNED_CONTENT_WIDTH}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={
              valuesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
            }
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center"
          >
            <h2 className="from-foreground/80 via-foreground to-foreground/80 bg-gradient-to-r bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              Our Core Values
            </h2>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg">
              The principles that guide everything we do and every decision we
              make.
            </p>
          </motion.div>

          <div className="grid gap-6 mt-6 md:grid-cols-2 xl:grid-cols-4">
            {aboutData.values?.map((value, index) => {
              const IconComponent = iconComponents[value.icon];

              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={
                    valuesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
                  }
                  transition={{
                    duration: 0.6,
                    delay: index * 0.1 + 0.2,
                    ease: 'easeOut',
                  }}
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  <CardHoverEffect
                    icon={<IconComponent className="h-6 w-6" />}
                    title={value.title}
                    description={value.description}
                    variant={'theme'}
                    className="[&>div:last-child]:opacity-60 [&>div:last-child>div]:blur-[52px]"
                    glowEffect={false}
                    size="lg"
                    flat={false}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </PageSection>
  );
}
