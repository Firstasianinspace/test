import { ErrorText } from '@/presentation/components/ErrorText';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { useSession } from '@/presentation/hooks/useSession';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  email: z.string().min(1, 'Введите email'),
  password: z.string().min(1, 'Введите пароль'),
});
type Values = z.infer<typeof schema>;

export function LoginPage() {
  const { signIn } = useSession();
  const [error, setError] = useState<unknown>(null);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  return (
    <div className="mx-auto mt-24 max-w-sm space-y-4 rounded-lg border bg-white p-6">
      <h1 className="text-xl font-semibold">Вход</h1>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          void handleSubmit(async (v) => {
            try {
              setError(null);
              await signIn(v.email, v.password);
            } catch (err) {
              setError(err);
            }
          })(e);
        }}
      >
        <Input type="email" placeholder="Email" autoComplete="username" {...register('email')} />
        <Input
          type="password"
          placeholder="Пароль"
          autoComplete="current-password"
          {...register('password')}
        />
        {Object.values(formState.errors).map((e) => (
          <p key={e.message} className="text-sm text-red-600">
            {e.message}
          </p>
        ))}
        <ErrorText error={error} />
        <Button type="submit" disabled={formState.isSubmitting}>
          Войти
        </Button>
      </form>
    </div>
  );
}
