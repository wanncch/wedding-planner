-- v4.2: bagian utama acara (dipakai hitung mundur & H-xx di Beranda)
-- Kosong = aturan bawaan: Lamaran → bagian Lamaran; Akad & Resepsi → bagian "Akad"; lainnya → bagian pertama.
alter table public.events add column if not exists main_part_id uuid references public.events on delete set null;
