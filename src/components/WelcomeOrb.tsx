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
    </div>
  );
}