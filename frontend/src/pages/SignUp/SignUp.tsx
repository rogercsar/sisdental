import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  User, 
  Lock, 
  Mail, 
  Loader2, 
  Stethoscope,
  CheckCircle,
  Users,
  Calendar,
  BarChart3,
  FileText,
  CreditCard,
  Zap,
  Phone,
  MapPin,
  Building2,
  GraduationCap,
  Award,
  Clock
} from "lucide-react";
import { useAuthStore } from "../../lib/store/auth";

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp, isLoading, error: storeError, clearError } = useAuthStore();
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1 - Basic Account Info
    name: "",
    email: "",
    password: "",
    // Step 2 - Professional Info
    license_number: "",
    specialization: "",
    graduation_year: "",
    phone: "",
    // Step 3 - Clinic Info
    clinic_name: "",
    clinic_address: "",
    clinic_phone: "",
    clinic_city: "",
    clinic_state: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    clearError();

    try {
      // Send all form data to signup
      await signUp(formData.email, formData.password, formData.name);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    }
  };

  const validateStep = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.email && formData.password.length >= 8;
      case 2:
        return formData.license_number && formData.specialization && formData.phone;
      case 3:
        return formData.clinic_name && formData.clinic_address && formData.clinic_city;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex">
      {/* Left Side - Branding & Benefits */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-cyan-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Stethoscope className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">SisDental</h1>
                <p className="text-cyan-100 text-sm">Sistema de Gestão Odontológica</p>
              </div>
            </div>
            
            <h2 className="text-4xl xl:text-5xl font-bold mb-4 leading-tight">
              Transforme sua<br />
              <span className="text-blue-200">clínica dental</span><br />
              hoje mesmo
            </h2>
            <p className="text-lg text-cyan-100 mb-8 leading-relaxed">
              Junte-se a centenas de dentistas que já modernizaram sua gestão com nossa plataforma completa e intuitiva.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0" />
              <span className="text-cyan-100">Gestão completa de pacientes e prontuários</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0" />
              <span className="text-cyan-100">Agendamento inteligente e lembretes automáticos</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0" />
              <span className="text-cyan-100">Controle financeiro e faturamento</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0" />
              <span className="text-cyan-100">Relatórios detalhados e analytics</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0" />
              <span className="text-cyan-100">Segurança médica e backup automático</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">500+</h3>
                <p className="text-cyan-100 text-sm">Dentistas ativos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">10k+</h3>
                <p className="text-cyan-100 text-sm">Consultas agendadas</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl"></div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-10 w-10 bg-cyan-600 rounded-xl flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">SisDental</h1>
            </div>
          </div>

          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Criar sua conta
              </CardTitle>
              <CardDescription className="text-gray-600">
                {step === 1 && "Informações básicas da conta"}
                {step === 2 && "Dados profissionais"}
                {step === 3 && "Informações da clínica"}
              </CardDescription>
              <div className="flex justify-center mt-4">
                <div className="flex items-center space-x-2">
                  {[1, 2, 3].map((stepNumber) => (
                    <div key={stepNumber} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step >= stepNumber 
                          ? 'bg-cyan-600 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {stepNumber}
                      </div>
                      {stepNumber < 3 && (
                        <div className={`w-8 h-0.5 ${
                          step > stepNumber ? 'bg-cyan-600' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Basic Account Info */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Nome completo *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          autoComplete="name"
                          required
                          maxLength={100}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                          placeholder="Dr. João Silva"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email profissional *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          autoComplete="email"
                          required
                          maxLength={100}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                          placeholder="contato@clinica.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        Senha *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          autoComplete="new-password"
                          required
                          minLength={8}
                          maxLength={100}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                          placeholder="Mínimo 8 caracteres"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Use pelo menos 8 caracteres com letras e números
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Professional Info */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="license_number" className="block text-sm font-medium text-gray-700 mb-2">
                        Número do CRO *
                      </label>
                      <div className="relative">
                        <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="license_number"
                          type="text"
                          value={formData.license_number}
                          onChange={(e) => handleInputChange('license_number', e.target.value)}
                          required
                          maxLength={20}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                          placeholder="CRO/SP 123456"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-2">
                        Especialização *
                      </label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <select
                          id="specialization"
                          value={formData.specialization}
                          onChange={(e) => handleInputChange('specialization', e.target.value)}
                          required
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                        >
                          <option value="">Selecione sua especialização</option>
                          <option value="clinico_geral">Clínico Geral</option>
                          <option value="ortodontia">Ortodontia</option>
                          <option value="endodontia">Endodontia</option>
                          <option value="periodontia">Periodontia</option>
                          <option value="cirurgia">Cirurgia Bucomaxilofacial</option>
                          <option value="implantodontia">Implantodontia</option>
                          <option value="protese">Prótese Dentária</option>
                          <option value="odontopediatria">Odontopediatria</option>
                          <option value="dentistica">Dentística</option>
                          <option value="outros">Outros</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="graduation_year" className="block text-sm font-medium text-gray-700 mb-2">
                          Ano de formatura
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            id="graduation_year"
                            type="number"
                            value={formData.graduation_year}
                            onChange={(e) => handleInputChange('graduation_year', e.target.value)}
                            min="1950"
                            max={new Date().getFullYear()}
                            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                            placeholder="2020"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                          Telefone *
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            required
                            maxLength={20}
                            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Clinic Info */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="clinic_name" className="block text-sm font-medium text-gray-700 mb-2">
                        Nome da clínica *
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="clinic_name"
                          type="text"
                          value={formData.clinic_name}
                          onChange={(e) => handleInputChange('clinic_name', e.target.value)}
                          required
                          maxLength={100}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                          placeholder="Clínica OdontoVida"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="clinic_address" className="block text-sm font-medium text-gray-700 mb-2">
                        Endereço da clínica *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="clinic_address"
                          type="text"
                          value={formData.clinic_address}
                          onChange={(e) => handleInputChange('clinic_address', e.target.value)}
                          required
                          maxLength={200}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                          placeholder="Rua das Flores, 123, Centro"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="clinic_city" className="block text-sm font-medium text-gray-700 mb-2">
                          Cidade *
                        </label>
                        <input
                          id="clinic_city"
                          type="text"
                          value={formData.clinic_city}
                          onChange={(e) => handleInputChange('clinic_city', e.target.value)}
                          required
                          maxLength={50}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                          placeholder="São Paulo"
                        />
                      </div>

                      <div>
                        <label htmlFor="clinic_state" className="block text-sm font-medium text-gray-700 mb-2">
                          Estado *
                        </label>
                        <select
                          id="clinic_state"
                          value={formData.clinic_state}
                          onChange={(e) => handleInputChange('clinic_state', e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                        >
                          <option value="">Estado</option>
                          <option value="AC">Acre</option>
                          <option value="AL">Alagoas</option>
                          <option value="AP">Amapá</option>
                          <option value="AM">Amazonas</option>
                          <option value="BA">Bahia</option>
                          <option value="CE">Ceará</option>
                          <option value="DF">Distrito Federal</option>
                          <option value="ES">Espírito Santo</option>
                          <option value="GO">Goiás</option>
                          <option value="MA">Maranhão</option>
                          <option value="MT">Mato Grosso</option>
                          <option value="MS">Mato Grosso do Sul</option>
                          <option value="MG">Minas Gerais</option>
                          <option value="PA">Pará</option>
                          <option value="PB">Paraíba</option>
                          <option value="PR">Paraná</option>
                          <option value="PE">Pernambuco</option>
                          <option value="PI">Piauí</option>
                          <option value="RJ">Rio de Janeiro</option>
                          <option value="RN">Rio Grande do Norte</option>
                          <option value="RS">Rio Grande do Sul</option>
                          <option value="RO">Rondônia</option>
                          <option value="RR">Roraima</option>
                          <option value="SC">Santa Catarina</option>
                          <option value="SP">São Paulo</option>
                          <option value="SE">Sergipe</option>
                          <option value="TO">Tocantins</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="clinic_phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Telefone da clínica
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="clinic_phone"
                          type="tel"
                          value={formData.clinic_phone}
                          onChange={(e) => handleInputChange('clinic_phone', e.target.value)}
                          maxLength={20}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                          placeholder="(11) 3333-4444"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(error || storeError) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm font-medium">
                      {error || storeError}
                    </p>
                  </div>
                )}

                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-cyan-800">Teste gratuito por 30 dias</p>
                      <p className="text-xs text-cyan-600 mt-1">
                        Acesso completo a todas as funcionalidades. Não é necessário cartão de crédito.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-3">
                  {step > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={prevStep}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                  )}
                  
                  {step < 3 ? (
                    <Button
                      type="button"
                      size="lg"
                      onClick={nextStep}
                      disabled={!validateStep(step)}
                      className={`${step === 1 ? 'w-full' : 'flex-1'} bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300`}
                    >
                      Continuar
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="lg"
                      className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      disabled={isLoading || !validateStep(step)}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin mr-2 h-5 w-5" />
                          Criando conta...
                        </>
                      ) : (
                        <>
                          <User className="mr-2 h-5 w-5" />
                          Criar conta gratuita
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Ao criar uma conta, você concorda com nossos{" "}
                  <Link to="/terms" className="text-cyan-600 hover:text-cyan-700 font-medium">
                    Termos de Uso
                  </Link>{" "}
                  e{" "}
                  <Link to="/privacy" className="text-cyan-600 hover:text-cyan-700 font-medium">
                    Política de Privacidade
                  </Link>
                </p>
              </form>

              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">
                      Já tem uma conta?
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <Link to="/login">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full font-semibold border-2 hover:bg-gray-50 transition-all duration-200"
                    >
                      <Mail className="mr-2 h-5 w-5" />
                      Fazer login
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Preview */}
          <div className="mt-8 grid grid-cols-2 gap-4 text-center lg:hidden">
            <div className="flex flex-col items-center p-4 bg-white/60 rounded-lg backdrop-blur-sm">
              <BarChart3 className="h-8 w-8 text-cyan-600 mb-2" />
              <h3 className="font-semibold text-sm text-gray-900">Relatórios</h3>
              <p className="text-xs text-gray-600">Analytics completos</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-white/60 rounded-lg backdrop-blur-sm">
              <FileText className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-semibold text-sm text-gray-900">Prontuários</h3>
              <p className="text-xs text-gray-600">Digitais e seguros</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}