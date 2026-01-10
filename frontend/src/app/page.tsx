"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GridBackground } from "@/components/ui/grid-background";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { Navbar } from "@/components/navbar";
import {
  Shield,
  Lock,
  Eye,
  ArrowRight,
  Building2,
  Users,
  Landmark,
  CheckCircle,
} from "lucide-react";

const steps = [
  {
    step: 1,
    title: "Deposit USDC",
    description: "Company deposits USDC to treasury, converting to confidential cUSDC",
    icon: Building2,
    color: "cyan",
  },
  {
    step: 2,
    title: "Set Payslip",
    description: "HR creates encrypted payslip with salary components",
    icon: Lock,
    color: "magenta",
  },
  {
    step: 3,
    title: "Compute & Pay",
    description: "Calculate net pay and execute confidential transfer",
    icon: CheckCircle,
    color: "orange",
  },
  {
    step: 4,
    title: "Decrypt & Verify",
    description: "Employee decrypts their payslip and verifies calculation",
    icon: Eye,
    color: "cyan",
  },
];

const features = [
  {
    title: "Employee Privacy",
    description: "Only you and your employer can see your salary. No third-party access.",
    icon: Lock,
  },
  {
    title: "On-chain Verification",
    description: "Employees can verify their pay calculation independently.",
    icon: CheckCircle,
  },
  {
    title: "Break-glass Compliance",
    description: "Government access requires dual approval + 24h timelock.",
    icon: Shield,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-vapor-bg">
      <Navbar />

      {/* Hero Section */}
      <GridBackground showSun className="min-h-[80vh] flex items-center">
        <div className="container mx-auto px-4 pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="font-orbitron text-5xl md:text-7xl font-bold mb-6">
              <span className="text-gradient">Confidential</span>
              <br />
              <span className="text-vapor-foreground">On-chain Payroll</span>
            </h1>

            <p className="text-xl md:text-2xl text-vapor-muted mb-8 max-w-2xl mx-auto font-mono">
              Privacy-preserving salary payments powered by{" "}
              <span className="text-vapor-cyan">Fully Homomorphic Encryption</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/issuer">
                <NeonButton size="xl">
                  <Building2 className="w-5 h-5 mr-2" />
                  Issuer Dashboard
                </NeonButton>
              </Link>
              <Link href="/employee">
                <NeonButton size="xl" variant="outline">
                  <Users className="w-5 h-5 mr-2" />
                  Employee Portal
                </NeonButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </GridBackground>

      {/* How it Works */}
      <section className="py-24 border-t border-vapor-border">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-orbitron text-3xl md:text-4xl font-bold text-vapor-foreground mb-4">
              How It Works
            </h2>
            <p className="text-vapor-muted max-w-2xl mx-auto">
              Secure, private, and verifiable payroll in four simple steps
            </p>
          </motion.div>

          {/* Timeline */}
          <div className="relative max-w-4xl mx-auto">
            {/* Connecting line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-vapor-cyan via-vapor-magenta to-vapor-orange hidden md:block" />

            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-8 mb-12 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                  <NeonCard accentColor={step.color as any}>
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          step.color === "cyan"
                            ? "bg-vapor-cyan/10 text-vapor-cyan"
                            : step.color === "magenta"
                            ? "bg-vapor-magenta/10 text-vapor-magenta"
                            : "bg-vapor-orange/10 text-vapor-orange"
                        }`}
                      >
                        <step.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-orbitron text-sm text-vapor-muted mb-1">
                          Step {step.step}
                        </div>
                        <h3 className="font-orbitron text-xl font-semibold text-vapor-foreground mb-2">
                          {step.title}
                        </h3>
                        <p className="text-vapor-muted text-sm">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </NeonCard>
                </div>

                {/* Center dot */}
                <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full border-2 border-vapor-border bg-vapor-bg z-10">
                  <div
                    className={`w-4 h-4 rounded-full ${
                      step.color === "cyan"
                        ? "bg-vapor-cyan shadow-neon"
                        : step.color === "magenta"
                        ? "bg-vapor-magenta shadow-neon-magenta"
                        : "bg-vapor-orange shadow-neon-orange"
                    }`}
                  />
                </div>

                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t border-vapor-border bg-vapor-bg-secondary">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-orbitron text-3xl md:text-4xl font-bold text-vapor-foreground mb-4">
              Privacy by Design
            </h2>
            <p className="text-vapor-muted max-w-2xl mx-auto">
              Built with trust and compliance in mind
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <NeonCard
                  accentColor={index === 0 ? "cyan" : index === 1 ? "magenta" : "orange"}
                  className="h-full"
                >
                  <div className="text-center">
                    <div className="inline-flex p-4 rounded-full bg-vapor-border/30 mb-4">
                      <feature.icon className="w-8 h-8 text-vapor-cyan" />
                    </div>
                    <h3 className="font-orbitron text-lg font-semibold text-vapor-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-vapor-muted text-sm">{feature.description}</p>
                  </div>
                </NeonCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-vapor-border">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-orbitron text-3xl md:text-4xl font-bold text-vapor-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-vapor-muted max-w-xl mx-auto mb-8">
              Connect your wallet and experience private payroll on-chain
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/issuer">
                <NeonButton size="lg">
                  Start as Issuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </NeonButton>
              </Link>
              <Link href="/government">
                <NeonButton size="lg" variant="outline-magenta">
                  <Landmark className="w-4 h-4 mr-2" />
                  Government Portal
                </NeonButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-vapor-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="font-orbitron text-xl font-bold text-gradient">
              PayWave
            </div>
            <p className="text-vapor-muted text-sm font-mono">
              Built with FHE • Powered by Zama FHEVM
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
