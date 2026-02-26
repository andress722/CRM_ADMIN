"use client";

import { AuthService } from "@/services/auth";
import { endpoints } from "@/services/endpoints";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";

type ProfilePreferences = {
  darkMode: boolean;
  notifications: boolean;
  [key: string]: boolean | string | number;
};

type Profile = {
  name: string;
  email: string;
  avatar?: string;
  preferences?: ProfilePreferences;
};

type ProfileHistory = {
  action: string;
  date: string;
  details?: string;
};

type ProfileForm = {
  name: string;
  email: string;
  avatar: string;
  password: string;
  preferences: ProfilePreferences;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history] = useState<ProfileHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    email: "",
    avatar: "",
    password: "",
    preferences: { darkMode: false, notifications: true },
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = AuthService.getToken();
    if (!token) {
      setError("Usuário não autenticado.");
      setLoading(false);
      return;
    }
    fetch(endpoints.admin.profile, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setProfile(data as Profile);
        setForm({
          name: data.name || "",
          email: data.email || "",
          avatar: data.avatar || "",
          password: "",
          preferences: data.preferences || {
            darkMode: false,
            notifications: true,
          },
        });
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar perfil.");
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("pref_")) {
      setForm((f) => ({
        ...f,
        preferences: {
          ...f.preferences,
          [name.replace("pref_", "")]: type === "checkbox" ? checked : value,
        },
      }));
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    const token = AuthService.getToken();
    try {
      const res = await fetch(endpoints.admin.profile + "/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      const uploadedUrl = (data as { url?: string }).url;
      if (uploadedUrl) {
        setForm((f) => ({ ...f, avatar: uploadedUrl }));
      }
    } catch {
      setError("Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = AuthService.getToken();
    try {
      await fetch(endpoints.admin.profile, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      setEditMode(false);
    } catch {
      setError("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando perfil...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!profile) return <div>Perfil não encontrado.</div>;

  return (
    <div className="max-w-xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Meu Perfil</h1>
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <Image
            src={form.avatar || "/default-avatar.png"}
            alt="Avatar"
            width={80}
            height={80}
            unoptimized
            className="w-20 h-20 rounded-full border object-cover"
          />
          {editMode && (
            <button
              type="button"
              className="absolute bottom-0 right-0 bg-blue-600 text-white px-2 py-1 rounded text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Enviando..." : "Trocar foto"}
            </button>
          )}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleAvatarUpload}
            disabled={uploading}
          />
        </div>
        <div>
          <div className="font-semibold text-lg">{profile.name}</div>
          <div className="text-gray-600">{profile.email}</div>
        </div>
      </div>
      {editMode ? (
        <form onSubmit={handleSave} className="space-y-4">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nome"
            className="border rounded px-2 py-1 w-full"
            required
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="border rounded px-2 py-1 w-full"
            required
          />
          <input
            type="text"
            name="avatar"
            value={form.avatar}
            onChange={handleChange}
            placeholder="URL da foto"
            className="border rounded px-2 py-1 w-full"
          />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Nova senha (opcional)"
            className="border rounded px-2 py-1 w-full"
          />
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="pref_darkMode"
                checked={form.preferences.darkMode}
                onChange={handleChange}
              />
              Tema escuro
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="pref_notifications"
                checked={form.preferences.notifications}
                onChange={handleChange}
              />
              Notificações
            </label>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded font-semibold mt-4"
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      ) : (
        <div className="space-y-2">
          <div>
            <span className="font-semibold">Nome:</span> {profile.name}
          </div>
          <div>
            <span className="font-semibold">Email:</span> {profile.email}
          </div>
          <div>
            <span className="font-semibold">Preferências:</span>{" "}
            {JSON.stringify(profile.preferences)}
          </div>
          <button
            onClick={() => setEditMode(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded font-semibold mt-4"
          >
            Editar perfil
          </button>
        </div>
      )}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Histórico de alterações</h2>
        {history.length === 0 ? (
          <div className="text-gray-500">Nenhuma alteração recente.</div>
        ) : (
          <ul className="space-y-2">
            {history.map((h, idx) => (
              <li key={idx} className="border rounded p-2 bg-gray-50">
                <div className="text-sm text-gray-700">{h.action}</div>
                <div className="text-xs text-gray-400">
                  {new Date(h.date).toLocaleString()}
                </div>
                {h.details && (
                  <div className="text-xs text-gray-600 mt-1">{h.details}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
