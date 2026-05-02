import { NavLink } from 'react-router-dom';

export default function Nav() {
  return (
    <header className="nav">
      <div className="nav-logo">
        Memories
      </div>
      <nav className="nav-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          📅 Diary
        </NavLink>
        <NavLink to="/mood" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          📊 Mood Week
        </NavLink>
      </nav>
    </header>
  );
}
