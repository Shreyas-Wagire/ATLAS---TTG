import FileUpload from './components/FileUpload.jsx'

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#d2dfdc]">
      {/* Soft cool mint ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: '700px', height: '700px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(204,251,241,0.5) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }} />
      </div>

      <div className="relative z-10">
        <FileUpload />
      </div>
    </main>
  );
}
