"use client";
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import ChangePasswordForm from './ChangePasswordForm';

export default function ChangePassword() {
  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <div className="container">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <h1 className="text-2xl text-white">Changer le mot de passe</h1>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
