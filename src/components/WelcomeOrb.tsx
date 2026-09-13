import { Sparkles } from "lucide-react";

export default function WelcomeOrb({ userName, modelLabel }: { userName: string; modelLabel: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center gap-5">
      <div className="h-28 w-28 rounded-full apex-orb" />
      <div>
        <h1 className="font-serif text-2xl leading-tight">
          {userName ? `Здравствуйте, ${userName}.` : "Здравствуйте."}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Я <span className="text-foreground">ApexCode</span> от Seulop. Готов помочь: код, тексты, файлы, проекты.
        </p>
        <p className="mt-3 text-[11px] uppercase tracking-widest text-primary/70">
          {modelLabel}
        </p>
      </div>

      <div className="apex-glass rounded-3xl px-4 py-3.5 max-w-sm text-left">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-lg apex-orb shrink-0 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </span>
          <span className="font-serif text-[15px]">Анонс: ApexAgent 2.1</span>
          <span className="ml-auto text-[9px] uppercase tracking-widest text-primary/80 border border-primary/40 rounded-full px-1.5 py-0.5">
            new
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Агентный режим: многошаговые задачи, самостоятельный веб-поиск с проверкой источников, работа с файлами и
          сборка проектов целиком.
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Все модели Apex обновлены до ядра <span className="text-foreground">2.3</span> — стабильнее вывод, сильнее код
          и усиленная защита от взлома промпта.
        </p>
      </div>
    </div>
  );
}
