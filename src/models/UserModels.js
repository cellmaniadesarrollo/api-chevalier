const UserModels = {};
const User = require('../db/users');
const PersonalData = require('../db/personalDatas'); // ajusta el path/nombre real del archivo
const Role = require('../db/roles'); // ajusta el path/nombre real del archivo
const bcrypt = require('bcryptjs');
// 🔹 Listado genérico de usuarios (para admin general)
UserModels.list = async ({ page = 1, limit = 20, search = '', status = 'active', role } = {}) => {
    const filter = {};

    // status: 'active' | 'deleted' | 'all'
    if (status === 'active') filter.available = true;
    else if (status === 'deleted') filter.available = false;

    if (role) filter.roles = role; // id de rol

    if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');

        const matchingPersonalData = await PersonalData.find({
            $or: [
                { firstnames: regex },
                { firstnames1: regex },
                { lastnames: regex },
                { lastnames1: regex },
                { dni: regex },
            ],
        }).select('_id');

        filter.$or = [
            { username: regex },
            { personalData: { $in: matchingPersonalData.map((p) => p._id) } },
        ];
    }

    return User.paginate(filter, {
        page: Number(page),
        limit: Number(limit),
        sort: { createdAt: -1 },
        select: '-password',
        populate: [
            { path: 'roles', select: 'name' },
            { path: 'personalData' },
        ],
    });
};

// 🔹 Listado específico de barberos (mismo filtro pero acotado por rol)
UserModels.listByRoleName = async (roleName, { page = 1, limit = 20, search = '', status = 'active' } = {}) => {
    const roleDoc = await Role.findOne({ name: roleName.toUpperCase() });
    if (!roleDoc) {
        const err = new Error(`El rol "${roleName}" no existe.`);
        err.code = 'ROLE_NOT_FOUND';
        throw err;
    }

    return UserModels.list({ page, limit, search, status, role: roleDoc._id });
};

UserModels.getById = async (userId) => {
    const user = await User.findById(userId)
        .select('-password')
        .populate('roles', 'name')
        .populate('personalData');

    if (!user) {
        const err = new Error('Usuario no encontrado.');
        err.code = 'USER_NOT_FOUND';
        throw err;
    }

    return user;
};

// 🔹 Editar usuario (datos de cuenta + datos personales en un solo request)
UserModels.update = async (userId, data) => {
    const { username, email, roles, password, personalData } = data;

    const user = await User.findById(userId);
    if (!user) {
        const err = new Error('Usuario no encontrado.');
        err.code = 'USER_NOT_FOUND';
        throw err;
    }

    if (username && username !== user.username) {
        const exists = await User.findOne({ username, _id: { $ne: userId } });
        if (exists) {
            const err = new Error('El nombre de usuario ya está en uso.');
            err.code = 'USER_USERNAME_TAKEN';
            throw err;
        }
        user.username = username;
    }

    if (email !== undefined) user.email = email;

    if (roles !== undefined) {
        if (!Array.isArray(roles) || roles.length === 0) {
            const err = new Error('Debe asignar al menos un rol.');
            err.code = 'USER_INVALID_ROLES';
            throw err;
        }
        user.roles = roles;
    }

    if (password) {
        // ajusta el require según la lib de hashing que ya uses en tu login
        const bcrypt = require('bcrypt');
        user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    if (personalData && typeof personalData === 'object') {
        const pd = await PersonalData.findById(user.personalData);
        if (!pd) {
            const err = new Error('Datos personales no encontrados.');
            err.code = 'PERSONALDATA_NOT_FOUND';
            throw err;
        }

        if (personalData.dni && personalData.dni !== pd.dni) {
            const dupDni = await PersonalData.findOne({ dni: personalData.dni, _id: { $ne: pd._id } });
            if (dupDni) {
                const err = new Error('La cédula ya está registrada por otro usuario.');
                err.code = 'PERSONALDATA_DNI_TAKEN';
                throw err;
            }
        }

        ['dni', 'firstnames', 'firstnames1', 'lastnames', 'lastnames1', 'date_of_admission', 'dateOfBirth', 'phone']
            .forEach((field) => {
                if (personalData[field] !== undefined) pd[field] = personalData[field];
            });

        await pd.save();
    }

    return UserModels.getById(userId);
};

// 🔹 Soft delete
UserModels.softDelete = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error('Usuario no encontrado.');
        err.code = 'USER_NOT_FOUND';
        throw err;
    }

    if (!user.available) {
        const err = new Error('El usuario ya está inactivo.');
        err.code = 'USER_ALREADY_DELETED';
        throw err;
    }

    user.available = false;
    user.sessionId = null; // fuerza cierre de sesión activa
    await user.save();

    return UserModels.getById(userId);
};

// 🔹 Reactivar
UserModels.restore = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error('Usuario no encontrado.');
        err.code = 'USER_NOT_FOUND';
        throw err;
    }

    if (user.available) {
        const err = new Error('El usuario ya está activo.');
        err.code = 'USER_ALREADY_ACTIVE';
        throw err;
    }

    user.available = true;
    await user.save();

    return UserModels.getById(userId);
};
// 🔹 Crear usuario (cuenta + datos personales)
UserModels.create = async (data) => {
    const { username, email, password, roles, personalData } = data;
    try {
        if (!username || !username.trim()) {
            const err = new Error('El nombre de usuario es obligatorio.');
            err.code = 'USER_INVALID_USERNAME';
            throw err;
        }

        if (!password || password.length < 6) {
            const err = new Error('La contraseña debe tener al menos 6 caracteres.');
            err.code = 'USER_INVALID_PASSWORD';
            throw err;
        }

        if (!Array.isArray(roles) || roles.length === 0) {
            const err = new Error('Debe asignar al menos un rol.');
            err.code = 'USER_INVALID_ROLES';
            throw err;
        }

        if (!personalData || typeof personalData !== 'object') {
            const err = new Error('Debe ingresar los datos personales del usuario.');
            err.code = 'USER_INVALID_PERSONALDATA';
            throw err;
        }

        const { dni, firstnames, lastnames, date_of_admission } = personalData;
        if (!dni || !firstnames || !lastnames || !date_of_admission) {
            const err = new Error('Cédula, nombres, apellidos y fecha de ingreso son obligatorios.');
            err.code = 'USER_INVALID_PERSONALDATA';
            throw err;
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            const err = new Error('El nombre de usuario ya está en uso.');
            err.code = 'USER_USERNAME_TAKEN';
            throw err;
        }

        const existingDni = await PersonalData.findOne({ dni });
        if (existingDni) {
            const err = new Error('La cédula ya está registrada.');
            err.code = 'PERSONALDATA_DNI_TAKEN';
            throw err;
        }

        const pd = await PersonalData.create(personalData);

        const hashedPassword = await bcrypt.hash(password, 10);


        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            roles,
            personalData: pd._id,
        });

        return UserModels.getById(user._id);
    } catch (error) {
        console.log(error)
        // rollback: si falla la creación del user, no dejamos un personalData huérfano
        await PersonalData.findByIdAndDelete(pd._id);
        throw error;
    }
};
module.exports = UserModels;