import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, Info, Calendar, Sparkles, Smartphone, GraduationCap, Mail, User, BookOpen, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Registration } from '../types';

const AVAILABLE_SUBJECTS = [
  "Administration Windows / Linux",
  "Équations différentielles, suites et séries numériques",
  "SQL",
  "Algèbre relationnelle",
  "Python",
  "Recherche opérationnelle",
  "Théorie des graphes"
];

interface RegistrationFormProps {
  initialPack: 'Pulse' | 'Private' | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (data: Omit<Registration, 'id' | 'created_at' | 'status' | 'payment_received'>) => Promise<void>;
}

const formSchema = z.object({
  fullname: z.string().min(3, "Le nom complet doit faire au moins 3 caractères"),
  phone: z.string().min(8, "Le numéro WhatsApp doit être valide (au moins 8 chiffres)"),
  email: z.string().email("Adresse email invalide").optional().or(z.literal('')),
  university: z.string().min(2, "Veuillez entrer le nom de votre université"),
  field: z.string().min(2, "Veuillez spécifier votre filière"),
  level: z.string().min(2, "Veuillez spécifier votre niveau d'études"),
  subjects: z.string().min(3, "Veuillez lister au moins une matière"),
  pack: z.enum(['Pulse', 'Private']),
  selected_sessions: z.coerce.number().min(1)
});

type FormValues = z.infer<typeof formSchema>;

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  initialPack,
  isOpen,
  onClose,
  onSubmitSuccess
}) => {
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      fullname: '',
      phone: '',
      email: '',
      university: '',
      field: '',
      level: '',
      subjects: '',
      pack: initialPack || 'Pulse',
      selected_sessions: initialPack === 'Private' ? 3 : 5,
    },
    mode: 'onChange'
  });

  const selectedPack = watch('pack');
  const selectedSessions = watch('selected_sessions');

  const [subjectAllocations, setSubjectAllocations] = useState<Record<string, number>>({});

  const totalAllocated = (Object.values(subjectAllocations) as number[]).reduce((sum, count) => sum + count, 0);
  const remainingSessions = selectedSessions - totalAllocated;

  const handleToggleSubject = (subject: string) => {
    if (subjectAllocations[subject]) {
      const { [subject]: _, ...rest } = subjectAllocations;
      setSubjectAllocations(rest);
    } else {
      if (remainingSessions > 0) {
        setSubjectAllocations(prev => ({
          ...prev,
          [subject]: 1
        }));
      } else {
        toast.warning(`Vous avez déjà alloué toutes vos ${selectedSessions} séances. Veuillez d'abord libérer des séances.`);
      }
    }
  };

  const handleIncrementSubject = (subject: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (remainingSessions > 0) {
      setSubjectAllocations(prev => ({
        ...prev,
        [subject]: (prev[subject] || 0) + 1
      }));
    } else {
      toast.warning("Toutes vos séances ont été distribuées. Augmentez le nombre total de séances ou réduisez une autre matière.");
    }
  };

  const handleDecrementSubject = (subject: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentCount = subjectAllocations[subject] || 0;
    if (currentCount > 1) {
      setSubjectAllocations(prev => ({
        ...prev,
        [subject]: currentCount - 1
      }));
    } else if (currentCount === 1) {
      const { [subject]: _, ...rest } = subjectAllocations;
      setSubjectAllocations(rest);
    }
  };

  // Synchronize with react-hook-form
  useEffect(() => {
    const entries = Object.entries(subjectAllocations) as [string, number][];
    const subjectsString = entries
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => `${name} (${count} séance${count > 1 ? 's' : ''})`)
      .join(', ');
    setValue('subjects', subjectsString, { shouldValidate: true });
  }, [subjectAllocations, setValue]);

  // If selectedSessions changes, ensure our allocated sessions don't exceed it
  useEffect(() => {
    if (totalAllocated > selectedSessions) {
      setSubjectAllocations({});
    }
  }, [selectedSessions, totalAllocated]);

  // Set the pack inside the form when initialPack changes or modal is opened
  useEffect(() => {
    if (isOpen && initialPack) {
      setValue('pack', initialPack);
      setValue('selected_sessions', initialPack === 'Private' ? 3 : 5);
      setSubjectAllocations({});
      setStep('form');
    }
  }, [isOpen, initialPack, setValue]);

  // Limits for each pack
  const maxSessions = selectedPack === 'Pulse' ? 5 : 3;
  const pricePerSession = selectedPack === 'Pulse' ? 600 : 1000;
  const totalPrice = selectedSessions * pricePerSession;

  // Clamp the sessions count if pack changes
  useEffect(() => {
    if (selectedPack === 'Pulse' && selectedSessions > 5) {
      setValue('selected_sessions', 5);
    } else if (selectedPack === 'Private' && selectedSessions > 3) {
      setValue('selected_sessions', 3);
    }
  }, [selectedPack, selectedSessions, setValue]);

  if (!isOpen) return null;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (remainingSessions !== 0) {
      if (remainingSessions > 0) {
        toast.error(`Veuillez distribuer vos ${remainingSessions} séance(s) restante(s) parmi vos matières.`);
      } else {
        toast.error(`Vous avez alloué trop de séances. Veuillez en libérer ${Math.abs(remainingSessions)}.`);
      }
      return;
    }
    if (isValid) {
      setStep('confirm');
    } else {
      toast.error("Veuillez remplir correctement tous les champs requis.");
    }
  };

  const handleFinalSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmitSuccess({
        fullname: data.fullname,
        phone: data.phone,
        email: data.email || undefined,
        university: data.university,
        field: data.field,
        level: data.level,
        subjects: data.subjects,
        pack: data.pack,
        total_sessions: data.pack === 'Pulse' ? 5 : 3,
        selected_sessions: data.selected_sessions,
        price_per_session: pricePerSession,
        total_price: totalPrice,
      });
      setStep('success');
      toast.success("Votre inscription a été reçue avec succès !");
    } catch (error) {
      toast.error("Une erreur s'est produite lors de l'inscription.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          id="modal-overlay"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
          id="registration-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h3 className="text-xl font-semibold font-serif text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#007a5e]" />
                {step === 'form' && "Inscription Rattrapage"}
                {step === 'confirm' && "Résumé de votre inscription"}
                {step === 'success' && "Félicitations !"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {step === 'form' && "Renseignez vos coordonnées et préparez vos examens."}
                {step === 'confirm' && "Veuillez vérifier vos informations avant de confirmer."}
                {step === 'success' && "Votre demande est enregistrée."}
              </p>
            </div>
            {step !== 'success' && (
              <button
                id="close-modal-btn"
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {step === 'form' && (
                <motion.form
                  key="form-step"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleNextStep}
                  className="space-y-5"
                  id="enrollment-form"
                >
                  {/* Pack & Session pricing teaser */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="space-y-1">
                      <span className="text-[10px] text-emerald-800 uppercase tracking-wider font-semibold">Formule choisie</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#007a5e] font-semibold text-white shadow-sm">
                          {selectedPack}
                        </span>
                        <span className="text-xs font-semibold text-emerald-950">
                          {selectedPack === 'Pulse' ? '3000 FCFA / 5 s.' : '3000 FCFA / 3 s.'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-center border-l border-emerald-100 pl-4">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Prix unitaire</span>
                      <span className="text-lg font-bold text-[#007a5e] font-mono">
                        {pricePerSession} FCFA <span className="text-xs font-normal text-slate-400">/s.</span>
                      </span>
                    </div>
                  </div>

                  {/* Nom complet */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-[#007a5e]" /> Nom complet *
                    </label>
                    <input
                      id="fullname-input"
                      type="text"
                      {...register('fullname')}
                      placeholder="Ex: Kouamé Jean-Marc"
                      className="w-full rounded-xl px-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm"
                    />
                    {errors.fullname && (
                      <p className="text-xs text-red-500 mt-1.5">{errors.fullname.message}</p>
                    )}
                  </div>

                  {/* Phone & Email Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Smartphone className="h-3.5 w-3.5 text-[#007a5e]" /> WhatsApp *
                      </label>
                      <input
                        id="phone-input"
                        type="tel"
                        {...register('phone')}
                        placeholder="Ex: +225 0707XXXXXX"
                        className="w-full rounded-xl px-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm font-mono"
                      />
                      {errors.phone && (
                        <p className="text-xs text-red-500 mt-1.5">{errors.phone.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-[#007a5e]" /> Email (Optionnel)
                      </label>
                      <input
                        id="email-input"
                        type="email"
                        {...register('email')}
                        placeholder="Ex: jean.marc@univ.ci"
                        className="w-full rounded-xl px-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm"
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500 mt-1.5">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  {/* University & Field & Level */}
                  <div className="p-4 rounded-xl bg-slate-50 space-y-4 border border-slate-100">
                    <span className="text-xs font-semibold text-[#007a5e] uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" /> Profil académique
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Université *</label>
                        <input
                          id="university-input"
                          type="text"
                          {...register('university')}
                          placeholder="Ex: UFHB Cocody"
                          className="w-full rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-white text-slate-800 text-xs"
                        />
                        {errors.university && (
                          <p className="text-[10px] text-red-500 mt-1">{errors.university.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Filière *</label>
                        <input
                          id="field-input"
                          type="text"
                          {...register('field')}
                          placeholder="Ex: Informatique"
                          className="w-full rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-white text-slate-800 text-xs"
                        />
                        {errors.field && (
                          <p className="text-[10px] text-red-500 mt-1">{errors.field.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Niveau d'études *</label>
                        <select
                          id="level-select"
                          {...register('level')}
                          className="w-full rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-white text-[#1f2937] text-xs h-[38px]"
                        >
                          <option value="">Sélectionner</option>
                          <option value="Licence 1">Licence 1</option>
                          <option value="Licence 2">Licence 2</option>
                          <option value="Licence 3">Licence 3</option>
                          <option value="Master 1">Master 1</option>
                          <option value="Master 2">Master 2</option>
                          <option value="Autre">Autre</option>
                        </select>
                        {errors.level && (
                          <p className="text-[10px] text-red-500 mt-1">{errors.level.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subjects Selection Grid */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5 text-[#007a5e]" /> Choix des matières & séances *
                      </label>
                      <span className="text-xs font-semibold text-[#007a5e] bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                        Répartition : {totalAllocated} / {selectedSessions} séance{selectedSessions > 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-500 italic">
                      Sélectionnez vos matières puis distribuez vos <strong>{selectedSessions}</strong> séances parmi elles (vous pouvez allouer plusieurs séances à la même matière) :
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" id="subjects-selector-grid">
                      {AVAILABLE_SUBJECTS.map((subject) => {
                        const count = subjectAllocations[subject] || 0;
                        const isSelected = count > 0;
                        return (
                          <div
                            key={subject}
                            onClick={() => handleToggleSubject(subject)}
                            className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer h-full min-h-[58px] ${
                              isSelected
                                ? 'bg-[#007a5e]/5 border-[#007a5e] text-[#007a5e] font-semibold ring-2 ring-[#007a5e]/10'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <span className={`w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center border transition-all ${
                                isSelected ? 'bg-[#007a5e] border-[#007a5e] text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </span>
                              <span className="leading-snug break-words pr-2">{subject}</span>
                            </div>

                            {isSelected && (
                              <div className="flex items-center gap-1.5 shrink-0 bg-white border border-[#007a5e]/20 rounded-lg p-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => handleDecrementSubject(subject, e)}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="font-mono text-xs font-bold text-slate-800 min-w-[12px] text-center">
                                  {count}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleIncrementSubject(subject, e)}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {errors.subjects && (
                      <p className="text-xs text-red-500 mt-1">{errors.subjects.message}</p>
                    )}
                    {remainingSessions > 0 ? (
                      <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5 mt-1">
                        ⚠️ Veuillez distribuer vos <strong>{remainingSessions}</strong> séance{remainingSessions > 1 ? 's' : ''} restante{remainingSessions > 1 ? 's' : ''}.
                      </p>
                    ) : remainingSessions < 0 ? (
                      <p className="text-xs text-red-500 font-medium flex items-center gap-1.5 mt-1">
                        ⚠️ Vous avez alloué {Math.abs(remainingSessions)} séance{Math.abs(remainingSessions) > 1 ? 's' : ''} de trop. Veuillez en retirer.
                      </p>
                    ) : (
                      <p className="text-xs text-[#007a5e] font-medium flex items-center gap-1.5 mt-1">
                        ✅ Toutes vos {selectedSessions} séances ont été parfaitement réparties !
                      </p>
                    )}
                  </div>

                  {/* Interactive Session Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Formule d'accompagnement
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          id="select-pulse-btn"
                          type="button"
                          onClick={() => {
                            setValue('pack', 'Pulse');
                            setValue('selected_sessions', 5);
                          }}
                          className={`rounded-xl py-3 text-center text-xs font-semibold border transition-all cursor-pointer ${
                            selectedPack === 'Pulse'
                              ? 'bg-[#007a5e] border-[#005f48] text-white shadow-md'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          Pulse (Public)
                        </button>
                        <button
                          id="select-private-btn"
                          type="button"
                          onClick={() => {
                            setValue('pack', 'Private');
                            setValue('selected_sessions', 3);
                          }}
                          className={`rounded-xl py-3 text-center text-xs font-semibold border transition-all cursor-pointer ${
                            selectedPack === 'Private'
                              ? 'bg-[#00966b] border-[#007a5e] text-white shadow-md'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          Private (Individuel)
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Séances souhaitées *
                        </label>
                        <span className="text-[10px] text-slate-400">
                          (Max {maxSessions} pour {selectedPack})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          id="decrement-sessions-btn"
                          type="button"
                          disabled={selectedSessions <= 1}
                          onClick={() => setValue('selected_sessions', Math.max(1, selectedSessions - 1))}
                          className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold transition-all disabled:opacity-30 cursor-pointer"
                        >
                          -
                        </button>
                        <div className="flex-1 text-center py-2 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-lg font-bold font-mono text-slate-900">{selectedSessions}</span>
                          <span className="text-xs text-slate-500 ml-1">séance{selectedSessions > 1 ? 's' : ''}</span>
                        </div>
                        <button
                          id="increment-sessions-btn"
                          type="button"
                          disabled={selectedSessions >= maxSessions}
                          onClick={() => setValue('selected_sessions', Math.min(maxSessions, selectedSessions + 1))}
                          className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold transition-all disabled:opacity-30 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Calculation Display */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-[#007a5e]/20 flex justify-between items-center mt-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide">Facturation en temps réel</span>
                      <div className="text-xs text-slate-500 font-mono">
                        {selectedSessions} séance{selectedSessions > 1 ? 's' : ''} x {pricePerSession} FCFA
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Montant Total</span>
                      <span className="text-2xl font-black font-mono text-[#007a5e]">
                        {totalPrice.toLocaleString('fr-FR')} <span className="text-sm font-semibold text-slate-500">FCFA</span>
                      </span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-3 border-t border-slate-100">
                    <button
                      id="cancel-registration-btn"
                      type="button"
                      onClick={onClose}
                      className="flex-1 rounded-xl py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-medium transition-all cursor-pointer border border-slate-200"
                    >
                      Annuler
                    </button>
                    <button
                      id="proceed-to-confirm-btn"
                      type="submit"
                      className="flex-1 rounded-xl py-3 bg-[#007a5e] hover:bg-[#005f48] text-white text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Continuer
                    </button>
                  </div>
                </motion.form>
              )}

              {step === 'confirm' && (
                <motion.div
                  key="confirm-step"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                  id="confirm-summary"
                >
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3">
                    <Info className="h-5 w-5 text-[#007a5e] shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-950 leading-relaxed">
                      Veuillez relire attentivement vos informations ci-dessous. Une fois validée, l'équipe Amphix vous contactera par WhatsApp pour finaliser l'inscription.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* General info */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 p-5 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Nom complet</span>
                        <span className="text-sm font-semibold text-slate-900">{watch('fullname')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">WhatsApp</span>
                        <span className="text-sm font-semibold text-slate-900 font-mono">{watch('phone')}</span>
                      </div>
                      {watch('email') && (
                        <div className="col-span-2">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Email</span>
                          <span className="text-sm text-slate-700">{watch('email')}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Université</span>
                        <span className="text-sm text-slate-700">{watch('university')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Filière / Niveau</span>
                        <span className="text-sm text-slate-700">{watch('field')} ({watch('level')})</span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Matières à préparer</span>
                        <span className="text-sm text-slate-700 block italic">"{watch('subjects')}"</span>
                      </div>
                    </div>

                    {/* Pricing summary */}
                    <div className="p-5 rounded-xl bg-gradient-to-br from-[#f2fdf7] to-white border border-emerald-100 space-y-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600 uppercase">Formule :</span>
                        <span className="px-3 py-1 rounded-full text-xs bg-[#007a5e] font-semibold text-white">
                          Amphix {selectedPack}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Séances réservées :</span>
                        <span className="font-semibold text-slate-800">{selectedSessions} séance{selectedSessions > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Tarif par séance :</span>
                        <span className="font-mono text-slate-800">{pricePerSession} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <span className="text-sm font-bold text-slate-900 uppercase">Montant total :</span>
                        <span className="text-xl font-bold text-[#007a5e] font-mono">
                          {totalPrice.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    </div>

                    {/* Instructions de paiement avant validation */}
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
                      <p className="text-xs text-amber-950 leading-relaxed font-medium">
                        ⚠️ <strong>Rappel important avant de commencer vos révisions :</strong><br />
                        Veuillez régler la somme de <strong className="text-[#007a5e] font-mono text-xs">{totalPrice.toLocaleString('fr-FR')} FCFA</strong> pour valider définitivement votre inscription.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                          <span className="font-bold text-[#007a5e] block text-[11px]">Dépôt Moov Money :</span>
                          <div className="font-mono mt-0.5 text-[10px] text-slate-700">
                            N° : <strong className="text-[#007a5e]">0168576110</strong><br />
                            Nom : <strong>KINDOHOUN ABIGAIL</strong>
                          </div>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-amber-100 flex flex-col justify-between">
                          <span className="font-bold text-[#007a5e] block text-[11px]">Par transfert / Autre :</span>
                          <div className="font-mono mt-0.5 text-[10px] text-slate-700">
                            Écrire au : <strong className="text-emerald-700">46244549</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-3 border-t border-slate-100">
                    <button
                      id="back-to-form-btn"
                      type="button"
                      onClick={() => setStep('form')}
                      className="flex-1 rounded-xl py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-medium transition-all cursor-pointer border border-slate-200"
                      disabled={isSubmitting}
                    >
                      Retour
                    </button>
                    <button
                      id="confirm-registration-btn"
                      type="button"
                      onClick={handleSubmit(handleFinalSubmit) as any}
                      disabled={isSubmitting}
                      className="flex-1 rounded-xl py-3 bg-[#007a5e] hover:bg-[#005f48] text-white text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Validation...
                        </>
                      ) : (
                        "Confirmer l'inscription"
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success-step"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-6 flex flex-col items-center text-center space-y-5"
                  id="success-message"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: 360 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100"
                  >
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </motion.div>

                  <div className="space-y-1.5 max-w-md">
                    <h4 className="text-xl font-semibold font-serif text-slate-900">Demande enregistrée !</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Merci <span className="font-semibold text-[#007a5e]">{watch('fullname')}</span> ! Votre inscription aux séances de rattrapage <span className="font-semibold">Amphix {selectedPack}</span> a bien été reçue.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Notre équipe vous contactera sur WhatsApp au <span className="font-mono text-slate-700 font-semibold">{watch('phone')}</span> sous 24h.
                    </p>
                  </div>

                  <div className="w-full max-w-sm p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-center gap-2 font-medium">
                    <Calendar className="h-4 w-4 text-[#007a5e]" />
                    {selectedSessions} séance{selectedSessions > 1 ? 's' : ''} : {totalPrice.toLocaleString('fr-FR')} FCFA
                  </div>

                  {/* Consignes de paiement post-inscription */}
                  <div className="w-full max-w-md p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 text-left space-y-3 shadow-sm">
                    <p className="text-xs text-slate-800 leading-relaxed font-semibold flex items-center gap-1.5 text-[#007a5e]">
                      <Info className="h-4 w-4" /> Procédure de paiement :
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Veuillez régler la somme de <strong className="text-[#007a5e] font-mono text-xs">{totalPrice.toLocaleString('fr-FR')} FCFA</strong> afin de valider définitivement et commencer vos révisions.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 bg-white rounded-lg border border-emerald-100">
                        <span className="font-bold text-[#007a5e] block">Dépôt direct (Moov Money) :</span>
                        <div className="font-mono mt-1 text-[10px] text-slate-700">
                          N° : <strong className="text-[#007a5e]">0168576110</strong><br />
                          Nom : <strong>KINDOHOUN ABIGAIL</strong>
                        </div>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-emerald-100 flex flex-col justify-between">
                        <span className="font-bold text-[#007a5e] block">Par transfert / Autre :</span>
                        <div className="font-mono mt-1 text-[10px] text-slate-700">
                          WhatsApp : <strong className="text-emerald-700">46244549</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    id="finish-success-btn"
                    onClick={onClose}
                    className="w-full max-w-xs rounded-full py-3 bg-[#007a5e] hover:bg-[#005f48] text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    Fermer
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
