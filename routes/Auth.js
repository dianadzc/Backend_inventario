// routes/auth.js - VERSIÓN MONGODB
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { authenticateToken, generateToken } = require('../middleware/auth');
const User = require('../models/User');
//const { loginLimiter } = require('../middleware/rateLimiter');
const { logAction } = require('../middleware/auditLogger');
const { validatePassword } = require('../utils/passwordValidator');



const router = express.Router();

// Login
router.post('/login', /*loginLimiter,*/ [
    body('username').notEmpty().withMessage('Usuario es requerido'),
    body('password').notEmpty().withMessage('Contraseña es requerida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        // Buscar usuario por username o email
        const user = await User.findOne({
            $or: [{ username }, { email: username }],
            active: true
        });

        if (!user) {
            // ⭐ Log de intento fallido
            await logAction(
                { ip: req.ip, get: req.get.bind(req) },
                'login',
                'auth',
                `Intento fallido de login para usuario: ${username}`,
                'failed'
            );
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Verificar contraseña
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            // ⭐ Log de intento fallido
            await logAction(
                { user: { id: user._id, username: user.username }, ip: req.ip, get: req.get.bind(req) },
                'login',
                'auth',
                `Contraseña incorrecta para usuario: ${username}`,
                'failed'
            );
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Generar token
        const token = generateToken(user);

        //  Log de login exitoso
        await logAction(
            { user: { id: user._id, username: user.username }, ip: req.ip, get: req.get.bind(req) },
            'login',
            'auth',
            `Usuario ${user.username} inició sesión`,
            'success'
        );

        
        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                department: user.department
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// Registro de usuarios (solo admin)
router.post('/register', authenticateToken, [
    body('username').isLength({ min: 3 }).withMessage('Usuario debe tener al menos 3 caracteres'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido'), // ⭐ OPCIONAL
    body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
    body('full_name').notEmpty().withMessage('Nombre completo es requerido')
], async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Solo administradores pueden registrar usuarios' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, full_name, role = 'user', department } = req.body;

        // Verificar si usuario o email ya existen
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Usuario o email ya existen' });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear usuario
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            full_name,
            role,
            department
        });

        await newUser.save();

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                full_name: newUser.full_name,
                role: newUser.role,
                department: newUser.department
            }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// Obtener todos los usuarios (solo admin)
router.get('/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Solo administradores pueden ver usuarios' });
        }

        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({ users });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// Actualizar usuario (solo admin)
router.put('/users/:id', authenticateToken, [
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido'),
    body('full_name').optional().notEmpty().withMessage('Nombre completo es requerido')
], async (req, res) => {
    try {
        console.log('🔐 Usuario haciendo la petición:', req.user); // Debug

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Solo administradores pueden actualizar usuarios' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { email, full_name, role, department, active, password } = req.body;

        const updateData = {};

        // Solo actualizar campos que se envíen
        if (email !== undefined) updateData.email = email || null;
        if (full_name !== undefined) updateData.full_name = full_name;
        if (role !== undefined) updateData.role = role;
        if (department !== undefined) updateData.department = department;
        if (active !== undefined) updateData.active = active;

        // Si se proporciona nueva contraseña
        if (password && password.trim() !== '') {
            const bcrypt = require('bcryptjs');
            updateData.password = await bcrypt.hash(password, 10);
        }

        console.log(' Actualizando usuario:', id, updateData);

        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({
            message: 'Usuario actualizado exitosamente',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            message: 'Error del servidor',
            error: error.message
        });
    }
});

// Obtener perfil del usuario
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// Cambiar contraseña
router.put('/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
    body('newPassword').isLength({ min: 6 }).withMessage('Nueva contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar contraseña actual
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ message: 'Contraseña actual incorrecta' });
        }

        // Hash nueva contraseña
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }


});

// ELIMINAR USUARIO (solo admin)
router.delete('/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Solo administradores pueden eliminar usuarios' });
        }

        const { id } = req.params;

        // ⭐ Evitar que el admin se elimine a sí mismo
        if (id === req.user.id || id === req.user._id?.toString()) {
            return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
        }

        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({
            message: 'Usuario eliminado exitosamente',
            deletedUser: {
                id: user._id,
                username: user.username,
                full_name: user.full_name
            }
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;